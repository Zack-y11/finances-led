import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateEntryGroup, CreateLedgerEntry } from '@finance/contracts';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { LedgerService } from '../ledger/ledger.service.js';

@Injectable()
export class EntryGroupsService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async create(input: CreateEntryGroup) {
    return this.prisma.db.$transaction(async (tx) => {
      const group = await tx.entryGroup.create({
        data: {
          userId: this.userId,
          name: input.name,
          type: input.type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'MIXED',
          description: input.description,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'EntryGroup',
          entityId: group.id,
          action: 'CREATE',
        },
      });

      return { ...group, total: '0.00' };
    });
  }

  async findAll() {
    const groups = await this.prisma.db.entryGroup.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!groups.length) return [];

    const totals = await this.prisma.db.ledgerEntry.groupBy({
      by: ['groupId'],
      where: {
        userId: this.userId,
        groupId: { in: groups.map((group) => group.id) },
      },
      _sum: { amount: true },
    });
    const totalsByGroupId = new Map(
      totals.map((item) => [item.groupId, item._sum.amount?.toString() ?? '0.00']),
    );

    return groups.map((group) => ({
      ...group,
      total: totalsByGroupId.get(group.id) ?? '0.00',
    }));
  }

  async findOne(id: string) {
    const group = await this.prisma.db.entryGroup.findFirst({
      where: { id, userId: this.userId },
      include: {
        ledgerEntries: {
          include: { account: true, category: true },
          orderBy: { occurredAt: 'desc' },
        },
      },
    });
    if (!group) throw new NotFoundException('Entry group not found');

    const total = await this.prisma.db.ledgerEntry.aggregate({
      where: { userId: this.userId, groupId: id },
      _sum: { amount: true },
    });

    return {
      ...group,
      total: total._sum.amount?.toString() ?? '0.00',
    };
  }

  async appendEntry(id: string, input: CreateLedgerEntry) {
    return this.ledgerService.createInGroup(id, input);
  }
}
