import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateLedgerEntry,
  LedgerEntriesQuery,
  UpdateLedgerEntry,
} from '@finance/contracts';
import {
  canCreateFromParsedCommand,
  ledgerStatusForConfidence,
} from '@finance/contracts';
import { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { MerchantsService } from '../merchants/merchants.service.js';

@Injectable()
export class LedgerService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantsService: MerchantsService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async create(input: CreateLedgerEntry) {
    return this.createEntry(input);
  }

  async createInGroup(groupId: string, input: CreateLedgerEntry) {
    return this.createEntry(input, groupId);
  }

  private async createEntry(input: CreateLedgerEntry, groupId?: string) {
    const status = this.statusForInput(input);

    await this.assertOwnedReferences(input.accountId, input.categoryId);
    if (groupId) await this.assertOwnedGroup(groupId);

    const occurredAt = new Date(input.occurredAt);
    const monthKey = input.occurredAt.slice(0, 7);
    const resolvedMerchant = await this.merchantsService.resolveForWrite(
      input.merchant,
    );

    if (input.inputSessionId) {
      const session = await this.prisma.db.inputSession.findFirst({
        where: { id: input.inputSessionId, userId: this.userId },
      });
      if (!session) throw new NotFoundException('Input session not found');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
        data: {
          userId: this.userId,
          accountId: input.accountId,
          categoryId: input.categoryId,
          groupId,
          type: input.type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'ADJUSTMENT',
          amount: input.amount,
          currency: input.currency,
          merchant: resolvedMerchant.merchant,
          merchantId: resolvedMerchant.merchantId,
          note: input.note,
          occurredAt,
          monthKey,
          inputMethod: input.inputMethod.toUpperCase() as
            'MANUAL' | 'TEXT' | 'VOICE' | 'RECEIPT',
          confidence: input.confidence,
          status,
        },
        include: { account: true, category: true, group: true },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'LedgerEntry',
          entityId: entry.id,
          action: 'CREATE',
          metadata: {
            inputMethod: input.inputMethod,
            ...(groupId ? { groupId } : {}),
            ...(input.confidence !== undefined
              ? { confidence: input.confidence }
              : {}),
            ...(input.inputSessionId
              ? { inputSessionId: input.inputSessionId }
              : {}),
          },
        },
      });

      if (
        resolvedMerchant.changed &&
        resolvedMerchant.original &&
        resolvedMerchant.merchant
      ) {
        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'LedgerEntry',
            entityId: entry.id,
            action: 'MERCHANT_NORMALIZED',
            reason: `Merchant "${resolvedMerchant.original}" was normalized to "${resolvedMerchant.merchant}".`,
            metadata: {
              original: resolvedMerchant.original,
              canonical: resolvedMerchant.merchant,
              ...(resolvedMerchant.merchantId
                ? { merchantId: resolvedMerchant.merchantId }
                : {}),
            },
          },
        });
      }

      if (status === 'NEEDS_REVIEW') {
        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'LedgerEntry',
            entityId: entry.id,
            action: 'MARK_NEEDS_REVIEW',
            reason: 'Parsed command was below the high-confidence threshold.',
            metadata: {
              confidence: input.confidence,
              inputMethod: input.inputMethod,
            },
          },
        });
      }

      if (input.inputSessionId) {
        await tx.inputSession.update({
          where: { id: input.inputSessionId },
          data: {
            ledgerEntryId: entry.id,
            status: status === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'CONFIRMED',
          },
        });
      }

      if (groupId) {
        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'EntryGroup',
            entityId: groupId,
            action: 'APPEND_ENTRY',
            metadata: { ledgerEntryId: entry.id },
          },
        });
      }

      return entry;
    });
  }

  async findAll(query: LedgerEntriesQuery) {
    const {
      type,
      month,
      startDate,
      endDate,
      categoryId,
      accountId,
      groupId,
      search,
      page,
      pageSize,
    } = query;

    const dateFilter: Prisma.LedgerEntryWhereInput =
      startDate || endDate
        ? {
            occurredAt: {
              ...(startDate
                ? { gte: new Date(`${startDate}T00:00:00.000Z`) }
                : {}),
              ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
            },
          }
        : month
          ? { monthKey: month }
          : {};

    const where: Prisma.LedgerEntryWhereInput = {
      userId: this.userId,
      ...dateFilter,
      ...(type
        ? { type: type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(groupId ? { groupId } : {}),
      ...(search
        ? {
            OR: [
              {
                merchant: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              { note: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.ledgerEntry.findMany({
        where,
        include: { account: true, category: true, group: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.db.ledgerEntry.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getOptions() {
    const [accounts, categories, groups] = await Promise.all([
      this.prisma.db.account.findMany({
        where: { userId: this.userId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.db.category.findMany({
        where: { userId: this.userId },
        select: { id: true, name: true, kind: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.db.entryGroup.findMany({
        where: { userId: this.userId },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { accounts, categories, groups };
  }
  async findOne(id: string) {
    const entry = await this.prisma.db.ledgerEntry.findFirst({
      where: { id, userId: this.userId },
      include: { account: true, category: true, group: true },
    });
    if (!entry) throw new NotFoundException('Ledger entry not found');
    return entry;
  }
  async update(id: string, input: UpdateLedgerEntry) {
    const existing = await this.findOne(id);
    if (input.accountId || input.categoryId) {
      await this.assertOwnedReferences(
        input.accountId ?? existing.accountId!,
        input.categoryId ?? existing.categoryId!,
      );
    }

    const occurredAt = input.occurredAt
      ? new Date(input.occurredAt)
      : existing.occurredAt;
    const monthKey = input.occurredAt
      ? input.occurredAt.slice(0, 7)
      : existing.monthKey;
    const resolvedMerchant =
      input.merchant !== undefined
        ? await this.merchantsService.resolveForWrite(input.merchant)
        : null;

    return this.prisma.db.$transaction(async (tx) => {
      const updated = await tx.ledgerEntry.update({
        where: { id },
        data: {
          ...(input.type !== undefined
            ? {
                type: input.type.toUpperCase() as
                  'INCOME' | 'EXPENSE' | 'ADJUSTMENT',
              }
            : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.currency !== undefined
            ? { currency: input.currency.toUpperCase() }
            : {}),
          ...(input.merchant !== undefined
            ? {
                merchant: resolvedMerchant?.merchant ?? null,
                merchantId: resolvedMerchant?.merchantId ?? null,
              }
            : {}),
          ...(input.accountId !== undefined
            ? { accountId: input.accountId }
            : {}),
          ...(input.categoryId !== undefined
            ? { categoryId: input.categoryId }
            : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          occurredAt,
          monthKey,
        },
        include: { account: true, category: true, group: true },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'LedgerEntry',
          entityId: id,
          action: 'UPDATE',
          metadata: {
            type: input.type,
            amount: input.amount,
            merchant: input.merchant ?? undefined,
          },
        },
      });

      if (
        resolvedMerchant?.changed &&
        resolvedMerchant.original &&
        resolvedMerchant.merchant
      ) {
        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'LedgerEntry',
            entityId: id,
            action: 'MERCHANT_NORMALIZED',
            reason: `Merchant "${resolvedMerchant.original}" was normalized to "${resolvedMerchant.merchant}".`,
            metadata: {
              original: resolvedMerchant.original,
              canonical: resolvedMerchant.merchant,
              ...(resolvedMerchant.merchantId
                ? { merchantId: resolvedMerchant.merchantId }
                : {}),
            },
          },
        });
      }

      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.db.$transaction(async (tx) => {
      await tx.ledgerEntry.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'LedgerEntry',
          entityId: id,
          action: 'DELETE',
          metadata: { ledgerEntryId: id },
        },
      });

      return { success: true, id };
    });
  }

  private async assertOwnedReferences(accountId: string, categoryId: string) {
    const [account, category] = await Promise.all([
      this.prisma.db.account.findFirst({
        where: { id: accountId, userId: this.userId, isActive: true },
      }),
      this.prisma.db.category.findFirst({
        where: { id: categoryId, userId: this.userId },
      }),
    ]);
    if (!account) throw new NotFoundException('Account not found');
    if (!category) throw new NotFoundException('Category not found');
  }

  private async assertOwnedGroup(groupId: string) {
    const group = await this.prisma.db.entryGroup.findFirst({
      where: { id: groupId, userId: this.userId },
    });
    if (!group) throw new NotFoundException('Entry group not found');
  }

  private statusForInput(input: CreateLedgerEntry): 'POSTED' | 'NEEDS_REVIEW' {
    if (input.inputMethod === 'manual') {
      return (input.status ?? 'posted').toUpperCase() as
        'POSTED' | 'NEEDS_REVIEW';
    }

    const confidence = input.confidence;
    if (
      confidence === undefined ||
      !Number.isFinite(confidence) ||
      !canCreateFromParsedCommand(confidence)
    ) {
      throw new BadRequestException(
        'AI ledger entries require confidence of at least 0.70',
      );
    }

    return ledgerStatusForConfidence(confidence).toUpperCase() as
      'POSTED' | 'NEEDS_REVIEW';
  }
}
