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

  async findAll(currency?: string) {
    const entries = await this.prisma.db.ledgerEntry.findMany({
      where: {
        userId: this.userId,
        status: 'POSTED',
        ...(currency ? { currency } : {}),
        merchant: { not: null },
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        merchant: true,
        merchantId: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'asc' },
    });

    const currencies = [...new Set(entries.map((entry) => entry.currency))];
    const data = currencies.flatMap((entryCurrency) =>
      detectRecurringPatterns(
        entries.flatMap((entry) =>
          entry.currency === entryCurrency && entry.merchant
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
      ).map((pattern) => ({ ...pattern, currency: entryCurrency })),
    );

    return { data };
  }
}
