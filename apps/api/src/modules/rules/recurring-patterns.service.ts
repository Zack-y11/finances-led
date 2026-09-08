import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { detectRecurringPatterns } from '@finance/rules';

import { PrismaService } from '../../infrastructure/prisma.service.js';

@Injectable()
export class RecurringPatternsService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async findAll() {
    const entries = await this.prisma.db.ledgerEntry.findMany({
      where: {
        userId: this.userId,
        status: 'POSTED',
        merchant: { not: null },
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        merchant: true,
        merchantId: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'asc' },
    });

    const data = detectRecurringPatterns(
      entries.flatMap((entry) =>
        entry.merchant
          ? [
              {
                id: entry.id,
                type: entry.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
                amount: Number(entry.amount),
                merchant: entry.merchant,
                merchantId: entry.merchantId,
                occurredAt: entry.occurredAt,
              },
            ]
          : [],
      ),
    );

    return { data };
  }
}
