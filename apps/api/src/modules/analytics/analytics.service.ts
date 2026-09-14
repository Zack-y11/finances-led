import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AnalyticsBreakdown,
  AnalyticsMonthOverview,
  AnalyticsSummary,
} from '@finance/contracts';
import { detectRecurringPatterns } from '@finance/rules';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { RecurringPatternsService } from '../rules/recurring-patterns.service.js';
import {
  buildCategoryBreakdown,
  buildMonthlySummary,
  centsFromDecimal,
  moneyTotals,
  pickRepeatedSpendingInsight,
  previousMonthKey,
  totalsFromCategoryRows,
  type CategoryAmountRow,
  type MonthlyTotals,
} from './analytics.aggregations.js';
import {
  projectMonthlyClose,
  type PredictionLedgerEntry,
} from './monthly-close-prediction.js';

@Injectable()
export class AnalyticsService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly recurringPatternsService: RecurringPatternsService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async monthlySummary(month: string): Promise<AnalyticsSummary> {
    const compared = await this.loadComparedMonths(month);
    return compared.summary;
  }

  async monthlyBreakdown(month: string): Promise<AnalyticsBreakdown> {
    const compared = await this.loadComparedMonths(month);
    return compared.breakdown;
  }

  async monthlyOverview(month: string): Promise<AnalyticsMonthOverview> {
    const [compared, insight] = await Promise.all([
      this.loadComparedMonths(month),
      this.repeatedSpendingInsight(month),
    ]);

    return {
      summary: compared.summary,
      breakdown: compared.breakdown,
      insight,
    };
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
        totals.incomeCents = centsFromDecimal(row._sum.amount);
      if (row.type === 'EXPENSE')
        totals.expenseCents = centsFromDecimal(row._sum.amount);
      totalsByMonth.set(row.monthKey, totals);
    }

    return Array.from(totalsByMonth, ([month, totals]) => ({
      month,
      ...moneyTotals(totals),
    }));
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
      amountCents: centsFromDecimal(entry.amount),
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

  private async loadComparedMonths(month: string) {
    const priorMonth = previousMonthKey(month);
    const [currentRows, priorRows] = await Promise.all([
      this.loadMonthRows(month),
      this.loadMonthRows(priorMonth),
    ]);
    const categoryNames = await this.categoryNames([
      ...currentRows,
      ...priorRows,
    ]);

    return {
      summary: buildMonthlySummary(
        month,
        totalsFromCategoryRows(currentRows),
        totalsFromCategoryRows(priorRows),
      ),
      breakdown: buildCategoryBreakdown(
        month,
        currentRows,
        priorRows,
        categoryNames,
      ),
    };
  }

  private async loadMonthRows(month: string): Promise<CategoryAmountRow[]> {
    const rows = await this.prisma.db.ledgerEntry.groupBy({
      by: ['type', 'categoryId'],
      where: {
        userId: this.userId,
        monthKey: month,
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      _sum: { amount: true },
    });

    return rows.map((row) => ({
      type: row.type,
      categoryId: row.categoryId,
      amountCents: centsFromDecimal(row._sum.amount),
    }));
  }

  private async categoryNames(rows: CategoryAmountRow[]) {
    const categoryIds = [
      ...new Set(
        rows
          .map((row) => row.categoryId)
          .filter((categoryId): categoryId is string => categoryId !== null),
      ),
    ];
    if (!categoryIds.length) return new Map<string, string>();

    const categories = await this.prisma.db.category.findMany({
      where: { userId: this.userId, id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    return new Map(categories.map((category) => [category.id, category.name]));
  }

  private async repeatedSpendingInsight(month: string) {
    const { data: patterns } = await this.recurringPatternsService.findAll();
    if (!patterns.length) return null;

    const monthEntries = await this.prisma.db.ledgerEntry.findMany({
      where: {
        userId: this.userId,
        monthKey: month,
        type: 'EXPENSE',
        status: 'POSTED',
        merchant: { not: null },
      },
      select: {
        merchant: true,
        merchantId: true,
        amount: true,
      },
    });

    return pickRepeatedSpendingInsight(
      patterns,
      monthEntries.map((entry) => ({
        merchant: entry.merchant,
        merchantId: entry.merchantId,
        amountCents: centsFromDecimal(entry.amount),
      })),
    );
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
