import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma.service.js';

type ReviewTransition = {
  entryStatus: 'POSTED' | 'IGNORED';
  sessionStatus: 'CONFIRMED' | 'FAILED';
  entryAction: 'APPROVE' | 'REJECT';
  sessionAction: 'CONFIRM' | 'REJECT';
  reason: string;
};

@Injectable()
export class ReviewInboxService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async findAll(statusFilter?: string) {
    const status = statusFilter ? statusFilter.toUpperCase() : 'NEEDS_REVIEW';
    const entries = await this.prisma.db.ledgerEntry.findMany({
      where: {
        userId: this.userId,
        status: status as 'NEEDS_REVIEW' | 'POSTED' | 'IGNORED',
      },
      include: { account: true, category: true, group: true },
      orderBy: { createdAt: 'desc' },
    });

    const [pendingCount, highConfidenceCount, needsAttentionCount] =
      await Promise.all([
        this.prisma.db.ledgerEntry.count({
          where: { userId: this.userId, status: 'NEEDS_REVIEW' },
        }),
        this.prisma.db.ledgerEntry.count({
          where: {
            userId: this.userId,
            status: 'POSTED',
            confidence: { gte: 0.8 },
          },
        }),
        this.prisma.db.ledgerEntry.count({
          where: {
            userId: this.userId,
            status: 'NEEDS_REVIEW',
            confidence: { lt: 0.8 },
          },
        }),
      ]);

    return {
      data: entries,
      metrics: {
        pending: pendingCount,
        highConfidence: highConfidenceCount,
        needsAttention: needsAttentionCount,
      },
    };
  }

  async approve(id: string) {
    return this.transition(id, {
      entryStatus: 'POSTED',
      sessionStatus: 'CONFIRMED',
      entryAction: 'APPROVE',
      sessionAction: 'CONFIRM',
      reason: 'Review item was approved and posted to the ledger.',
    });
  }

  async reject(id: string) {
    return this.transition(id, {
      entryStatus: 'IGNORED',
      sessionStatus: 'FAILED',
      entryAction: 'REJECT',
      sessionAction: 'REJECT',
      reason: 'Review item was rejected and ignored.',
    });
  }

  private async transition(id: string, transition: ReviewTransition) {
    return this.prisma.db.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.findFirst({
        where: { id, userId: this.userId },
        include: { inputSession: true },
      });
      if (!entry) throw new NotFoundException('Review item not found');
      if (entry.status !== 'NEEDS_REVIEW') {
        throw new ConflictException('Review item is no longer awaiting review');
      }

      // Keep the status predicate on the write as well as the read so a
      // concurrent approve/reject cannot apply a second transition.
      const updatedCount = await tx.ledgerEntry.updateMany({
        where: { id, userId: this.userId, status: 'NEEDS_REVIEW' },
        data: { status: transition.entryStatus },
      });
      if (updatedCount.count !== 1) {
        throw new ConflictException('Review item is no longer awaiting review');
      }

      if (entry.inputSession) {
        await tx.inputSession.update({
          where: { id: entry.inputSession.id },
          data: { status: transition.sessionStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'LedgerEntry',
          entityId: id,
          action: transition.entryAction,
          reason: transition.reason,
          metadata: {
            previousStatus: entry.status,
            newStatus: transition.entryStatus,
            ...(entry.inputSession
              ? { inputSessionId: entry.inputSession.id }
              : {}),
          },
        },
      });

      if (entry.inputSession) {
        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'InputSession',
            entityId: entry.inputSession.id,
            action: transition.sessionAction,
            reason: transition.reason,
            metadata: {
              previousStatus: entry.inputSession.status,
              newStatus: transition.sessionStatus,
              ledgerEntryId: id,
            },
          },
        });
      }

      return tx.ledgerEntry.findFirst({
        where: { id, userId: this.userId },
        include: { account: true, category: true, group: true },
      });
    });
  }
}
