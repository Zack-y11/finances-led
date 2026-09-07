import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  parsedFinanceCommandSchema,
  type ConfirmInputSession,
  type ReviewItem,
} from '@finance/contracts';
import type { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { RulesService } from '../rules/rules.service.js';

@Injectable()
export class ReviewInboxService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async findAll() {
    const sessions = await this.prisma.db.inputSession.findMany({
      where: { userId: this.userId, status: 'PROPOSED' },
      orderBy: { createdAt: 'desc' },
    });
    const allRuleIds = sessions.flatMap((session) =>
      readStringArray(session.appliedRuleIds),
    );
    const rules = await this.rulesService.getAppliedRules([
      ...new Set(allRuleIds),
    ]);
    const ruleById = new Map(rules.map((rule) => [rule.id, rule]));

    const data = sessions.flatMap<ReviewItem>((session) => {
      const proposal = parsedFinanceCommandSchema.safeParse(
        session.parsedPayload,
      );
      if (!proposal.success) return [];
      return [
        {
          id: session.id,
          status: 'proposed',
          proposal: proposal.data,
          appliedRules: readStringArray(session.appliedRuleIds).flatMap(
            (id) => {
              const rule = ruleById.get(id);
              return rule ? [rule] : [];
            },
          ),
          createdAt: session.createdAt.toISOString(),
        },
      ];
    });
    const highConfidence = sessions.filter(
      (session) => Number(session.confidence ?? 0) >= 0.8,
    ).length;

    return {
      data,
      metrics: {
        pending: sessions.length,
        highConfidence,
        needsAttention: sessions.length - highConfidence,
      },
    };
  }

  async confirm(id: string, input: ConfirmInputSession) {
    const existing = await this.findOwnedSession(id);
    if (existing.status === 'CONFIRMED' && existing.ledgerEntryId) {
      return this.prisma.db.ledgerEntry.findUniqueOrThrow({
        where: { id: existing.ledgerEntryId },
        include: { account: true, category: true, group: true },
      });
    }
    if (existing.status !== 'PROPOSED') {
      throw new ConflictException('Input session can no longer be confirmed');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const claimed = await tx.inputSession.updateMany({
        where: { id, userId: this.userId, status: 'PROPOSED' },
        data: { status: 'CONFIRMED', resolvedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Input session is already resolved');
      }

      const [account, category, group] = await Promise.all([
        tx.account.findFirst({
          where: {
            id: input.accountId,
            userId: this.userId,
            isActive: true,
          },
        }),
        tx.category.findFirst({
          where: { id: input.categoryId, userId: this.userId },
        }),
        input.groupId
          ? tx.entryGroup.findFirst({
              where: { id: input.groupId, userId: this.userId },
            })
          : Promise.resolve(null),
      ]);
      if (!account) throw new NotFoundException('Account not found');
      if (!category) throw new NotFoundException('Category not found');
      if (input.groupId && !group) {
        throw new NotFoundException('Entry group not found');
      }

      const entry = await tx.ledgerEntry.create({
        data: {
          userId: this.userId,
          accountId: input.accountId,
          categoryId: input.categoryId,
          groupId: input.groupId,
          type: input.type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'ADJUSTMENT',
          amount: input.amount,
          currency: input.currency.toUpperCase(),
          merchant: input.merchant,
          note: input.note,
          occurredAt: new Date(input.occurredAt),
          monthKey: input.occurredAt.slice(0, 7),
          inputMethod: 'TEXT',
          confidence: existing.confidence,
          status: 'POSTED',
        },
        include: { account: true, category: true, group: true },
      });

      await tx.inputSession.update({
        where: { id },
        data: { ledgerEntryId: entry.id },
      });
      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'LedgerEntry',
          entityId: entry.id,
          action: 'CONFIRM_TEXT_INTAKE',
          metadata: {
            inputSessionId: id,
            confidence: Number(existing.confidence ?? 0),
            appliedRuleIds: readStringArray(existing.appliedRuleIds),
          },
        },
      });
      if (input.groupId) {
        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'EntryGroup',
            entityId: input.groupId,
            action: 'APPEND_ENTRY',
            metadata: { ledgerEntryId: entry.id, inputSessionId: id },
          },
        });
      }
      return entry;
    });
  }

  async dismiss(id: string) {
    const existing = await this.findOwnedSession(id);
    if (existing.status === 'DISMISSED') return { success: true, id };
    if (existing.status !== 'PROPOSED') {
      throw new ConflictException('Input session can no longer be dismissed');
    }

    await this.prisma.db.$transaction(async (tx) => {
      const dismissed = await tx.inputSession.updateMany({
        where: { id, userId: this.userId, status: 'PROPOSED' },
        data: { status: 'DISMISSED', resolvedAt: new Date() },
      });
      if (dismissed.count !== 1) {
        throw new ConflictException('Input session is already resolved');
      }
      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'InputSession',
          entityId: id,
          action: 'DISMISS',
          metadata: {
            confidence: Number(existing.confidence ?? 0),
            appliedRuleIds: readStringArray(existing.appliedRuleIds),
          },
        },
      });
    });
    return { success: true, id };
  }

  private async findOwnedSession(id: string) {
    const session = await this.prisma.db.inputSession.findFirst({
      where: { id, userId: this.userId },
    });
    if (!session) throw new NotFoundException('Review item not found');
    return session;
  }
}

function readStringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
