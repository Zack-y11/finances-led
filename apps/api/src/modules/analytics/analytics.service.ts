import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { detectRecurringPatterns } from '@finance/rules';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import {
  projectMonthlyClose,
  type PredictionLedgerEntry,
} from './monthly-close-prediction.js';

type MonthlyTotals = {
  incomeCents: number;
  expenseCents: number;
};

@Injectable()
export class AnalyticsService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async monthlySummary(month: string) {
    const rows = await this.prisma.db.ledgerEntry.groupBy({
      by: ['type'],
      where: {
        userId: this.userId,
        monthKey: month,
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      _sum: { amount: true },
    });
    const totals = this.totalsFromRows(rows);

    return this.summary(month, totals);
  }

  async monthlyBreakdown(month: string) {
    const rows = await this.prisma.db.ledgerEntry.groupBy({
      by: ['type', 'categoryId'],
      where: {
        userId: this.userId,
        monthKey: month,
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      _sum: { amount: true },
    });
    const categoryIds = rows
      .map((row) => row.categoryId)
      .filter((categoryId): categoryId is string => categoryId !== null);
    const categories = categoryIds.length
      ? await this.prisma.db.category.findMany({
          where: { userId: this.userId, id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
    const categoryNames = new Map(
      categories.map((category) => [category.id, category.name]),
    );

    const breakdown = {
      expenses: [] as Array<{ category: string; amount: number }>,
      income: [] as Array<{ category: string; amount: number }>,
    };

    for (const row of rows) {
      const item = {
        category: row.categoryId
          ? (categoryNames.get(row.categoryId) ?? 'Uncategorized')
          : 'Uncategorized',
        amount: this.cents(row._sum.amount) / 100,
      };

      if (row.type === 'INCOME') {
        breakdown.income.push(item);
      } else {
        breakdown.expenses.push(item);
      }
    }

    breakdown.expenses.sort(
      (left, right) =>
        right.amount - left.amount ||
        left.category.localeCompare(right.category),
    );
    breakdown.income.sort(
      (left, right) =>
        right.amount - left.amount ||
        left.category.localeCompare(right.category),
    );

    return breakdown;
  }

  async netHistory() {
    const rows = await this.prisma.db.ledgerEntry.groupBy({
      by: ['monthKey', 'type'],
      where: {
        userId: this.userId,
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      _sum: { amount: true },
      orderBy: { monthKey: 'asc' },
    });
    const totalsByMonth = new Map<string, MonthlyTotals>();

    for (const row of rows) {
      const totals = totalsByMonth.get(row.monthKey) ?? {
        incomeCents: 0,
        expenseCents: 0,
      };
      if (row.type === 'INCOME')
        totals.incomeCents = this.cents(row._sum.amount);
      if (row.type === 'EXPENSE')
        totals.expenseCents = this.cents(row._sum.amount);
      totalsByMonth.set(row.monthKey, totals);
    }

    return Array.from(totalsByMonth, ([month, totals]) =>
      this.summary(month, totals),
    );
  }

  async monthlyClosePrediction(month: string, requestedAsOf?: string) {
    const asOf = this.asOfDate(month, requestedAsOf);
    const entries = await this.prisma.db.ledgerEntry.findMany({
      where: {
        userId: this.userId,
        status: 'POSTED',
        type: { in: ['INCOME', 'EXPENSE'] },
        occurredAt: { lte: this.endOfDay(asOf) },
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
    const snapshots = entries.map<PredictionLedgerEntry>((entry) => ({
      type: entry.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      amountCents: this.cents(entry.amount),
      merchant: entry.merchant,
      merchantId: entry.merchantId,
      occurredAt: entry.occurredAt,
    }));
    const recurringPatterns = detectRecurringPatterns(
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
      asOf,
    );

    return projectMonthlyClose({
      month,
      asOf,
      entries: snapshots,
      recurringPatterns,
    });
  }

  private totalsFromRows(
    rows: Array<{
      type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT';
      _sum: { amount: { toString(): string } | null };
    }>,
  ): MonthlyTotals {
    const totals: MonthlyTotals = { incomeCents: 0, expenseCents: 0 };
    for (const row of rows) {
      if (row.type === 'INCOME')
        totals.incomeCents = this.cents(row._sum.amount);
      if (row.type === 'EXPENSE')
        totals.expenseCents = this.cents(row._sum.amount);
    }
    return totals;
  }

  private summary(month: string, totals: MonthlyTotals) {
    return {
      month,
      income: totals.incomeCents / 100,
      expenses: totals.expenseCents / 100,
      net: (totals.incomeCents - totals.expenseCents) / 100,
    };
  }

  private cents(value: { toString(): string } | null): number {
    return Math.round(Number(value?.toString() ?? 0) * 100);
  }

  private asOfDate(month: string, requestedAsOf?: string): Date {
    const [yearText, monthText] = month.split('-');
    const year = Number(yearText);
    const monthNumber = Number(monthText);
    const startDay = Date.UTC(year, monthNumber - 1, 1);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const endDay = startDay + (daysInMonth - 1) * 86_400_000;
    const requestedDay = requestedAsOf
      ? Date.parse(`${requestedAsOf}T00:00:00.000Z`)
      : Date.now();
    return new Date(Math.min(Math.max(requestedDay, startDay), endDay));
  }

  private endOfDay(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }
}
