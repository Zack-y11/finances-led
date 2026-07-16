import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../infrastructure/prisma.service.js';

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
      by: ['categoryId'],
      where: {
        userId: this.userId,
        monthKey: month,
        type: 'EXPENSE',
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

    const expenses = rows
      .map((row) => ({
        category: row.categoryId
          ? (categoryNames.get(row.categoryId) ?? 'Uncategorized')
          : 'Uncategorized',
        amount: this.cents(row._sum.amount) / 100,
      }))
      .sort(
        (left, right) =>
          right.amount - left.amount ||
          left.category.localeCompare(right.category),
      );

    return { expenses };
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
}
