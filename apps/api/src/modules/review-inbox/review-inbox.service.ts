import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma.service.js';

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
    const entry = await this.prisma.db.ledgerEntry.findFirst({
      where: { id, userId: this.userId },
    });
    if (!entry) throw new NotFoundException('Review item not found');

    return this.prisma.db.ledgerEntry.update({
      where: { id },
      data: { status: 'POSTED' },
      include: { account: true, category: true, group: true },
    });
  }

  async reject(id: string) {
    const entry = await this.prisma.db.ledgerEntry.findFirst({
      where: { id, userId: this.userId },
    });
    if (!entry) throw new NotFoundException('Review item not found');

    return this.prisma.db.ledgerEntry.update({
      where: { id },
      data: { status: 'IGNORED' },
      include: { account: true, category: true, group: true },
    });
  }
}
