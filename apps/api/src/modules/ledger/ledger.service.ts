import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateLedgerEntry, LedgerEntriesQuery } from '@finance/contracts';
import { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';

@Injectable()
export class LedgerService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
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
    await this.assertOwnedReferences(input.accountId, input.categoryId);
    if (groupId) await this.assertOwnedGroup(groupId);

    const occurredAt = new Date(input.occurredAt);
    const monthKey = input.occurredAt.slice(0, 7);

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
          merchant: input.merchant,
          note: input.note,
          occurredAt,
          monthKey,
          inputMethod: input.inputMethod.toUpperCase() as
            'MANUAL' | 'TEXT' | 'VOICE' | 'RECEIPT',
        },
        include: { account: true, category: true, group: true },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'LedgerEntry',
          entityId: entry.id,
          action: 'CREATE',
          metadata: groupId
            ? { inputMethod: input.inputMethod, groupId }
            : { inputMethod: input.inputMethod },
        },
      });

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
      categoryId,
      accountId,
      groupId,
      search,
      page,
      pageSize,
    } = query;
    const where: Prisma.LedgerEntryWhereInput = {
      userId: this.userId,
      ...(type
        ? { type: type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' }
        : {}),
      ...(month ? { monthKey: month } : {}),
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
}
