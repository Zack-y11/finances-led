import type {
  AnalyticsBreakdown,
  AnalyticsCategoryBreakdownItem,
  AnalyticsMoneyTotals,
  AnalyticsRepeatedSpendingInsight,
  AnalyticsSummary,
  RecurringCadence,
} from '@finance/contracts';

export type CategoryAmountRow = {
  type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT';
  categoryId: string | null;
  amountCents: number;
};

export type MonthlyTotals = {
  incomeCents: number;
  expenseCents: number;
};

export type RecurringPatternSnapshot = {
  merchant: string;
  merchantId: string | null;
  type: 'income' | 'expense';
  cadence: RecurringCadence;
  medianAmount: number;
  occurrenceCount: number;
  lastOccurredAt: string;
  active: boolean;
};

export type MonthMerchantSpend = {
  merchant: string | null;
  merchantId: string | null;
  amountCents: number;
};

const UNCATED = 'Uncategorized';

export function previousMonthKey(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function centsFromDecimal(value: { toString(): string } | null): number {
  return Math.round(Number(value?.toString() ?? 0) * 100);
}

export function dollars(cents: number): number {
  return cents / 100;
}

export function shareOf(amountCents: number, totalCents: number): number {
  if (totalCents === 0) return 0;
  return Number((amountCents / totalCents).toFixed(4));
}

export function totalsFromCategoryRows(
  rows: CategoryAmountRow[],
): MonthlyTotals {
  const totals: MonthlyTotals = { incomeCents: 0, expenseCents: 0 };
  for (const row of rows) {
    if (row.type === 'INCOME') totals.incomeCents += row.amountCents;
    if (row.type === 'EXPENSE') totals.expenseCents += row.amountCents;
  }
  return totals;
}

export function moneyTotals(totals: MonthlyTotals): AnalyticsMoneyTotals {
  return {
    income: dollars(totals.incomeCents),
    expenses: dollars(totals.expenseCents),
    net: dollars(totals.incomeCents - totals.expenseCents),
  };
}

export function buildMonthlySummary(
  month: string,
  current: MonthlyTotals,
  prior: MonthlyTotals,
): AnalyticsSummary {
  const currentMoney = moneyTotals(current);
  const priorMoney = moneyTotals(prior);
  return {
    month,
    income: currentMoney.income,
    expenses: currentMoney.expenses,
    net: currentMoney.net,
    priorMonth: previousMonthKey(month),
    prior: priorMoney,
    delta: {
      income: dollars(current.incomeCents - prior.incomeCents),
      expenses: dollars(current.expenseCents - prior.expenseCents),
      net: dollars(
        current.incomeCents -
          current.expenseCents -
          (prior.incomeCents - prior.expenseCents),
      ),
    },
  };
}

export function buildCategoryBreakdown(
  month: string,
  currentRows: CategoryAmountRow[],
  priorRows: CategoryAmountRow[],
  categoryNames: Map<string, string>,
): AnalyticsBreakdown {
  const currentTotals = totalsFromCategoryRows(currentRows);
  const priorTotals = totalsFromCategoryRows(priorRows);

  return {
    month,
    priorMonth: previousMonthKey(month),
    totals: moneyTotals(currentTotals),
    priorTotals: moneyTotals(priorTotals),
    expenses: categoryItems(
      'EXPENSE',
      currentRows,
      priorRows,
      currentTotals.expenseCents,
      categoryNames,
    ),
    income: categoryItems(
      'INCOME',
      currentRows,
      priorRows,
      currentTotals.incomeCents,
      categoryNames,
    ),
  };
}

export function pickRepeatedSpendingInsight(
  patterns: RecurringPatternSnapshot[],
  monthEntries: MonthMerchantSpend[],
): AnalyticsRepeatedSpendingInsight | null {
  const expensePatterns = patterns.filter(
    (pattern) => pattern.type === 'expense',
  );
  if (!expensePatterns.length) return null;

  const scored = expensePatterns.map((pattern) => {
    const hits = monthEntries.filter((entry) => matchesPattern(pattern, entry));
    return {
      pattern,
      monthOccurrenceCount: hits.length,
      monthAmountCents: hits.reduce((sum, entry) => sum + entry.amountCents, 0),
    };
  });
  const inMonth = scored.filter((item) => item.monthOccurrenceCount > 0);
  const pool = inMonth.length
    ? inMonth
    : scored.filter((item) => item.pattern.active);
  const chosen = [...pool].sort(
    (left, right) =>
      right.monthAmountCents - left.monthAmountCents ||
      right.pattern.occurrenceCount - left.pattern.occurrenceCount ||
      left.pattern.merchant.localeCompare(right.pattern.merchant),
  )[0];

  if (!chosen) return null;

  return {
    kind: 'repeated_spending',
    merchant: chosen.pattern.merchant,
    merchantId: chosen.pattern.merchantId,
    cadence: chosen.pattern.cadence,
    medianAmount: chosen.pattern.medianAmount,
    occurrenceCount: chosen.pattern.occurrenceCount,
    lastOccurredAt: chosen.pattern.lastOccurredAt,
    monthOccurrenceCount: chosen.monthOccurrenceCount,
    monthAmount: dollars(chosen.monthAmountCents),
  };
}

function categoryItems(
  type: 'INCOME' | 'EXPENSE',
  currentRows: CategoryAmountRow[],
  priorRows: CategoryAmountRow[],
  totalCents: number,
  categoryNames: Map<string, string>,
): AnalyticsCategoryBreakdownItem[] {
  const priorByKey = new Map(
    priorRows
      .filter((row) => row.type === type)
      .map((row) => [categoryKey(row.categoryId), row.amountCents]),
  );

  return currentRows
    .filter((row) => row.type === type)
    .map((row) => {
      const priorAmountCents = priorByKey.get(categoryKey(row.categoryId)) ?? 0;
      return {
        categoryId: row.categoryId,
        category: row.categoryId
          ? (categoryNames.get(row.categoryId) ?? UNCATED)
          : UNCATED,
        amount: dollars(row.amountCents),
        priorAmount: dollars(priorAmountCents),
        delta: dollars(row.amountCents - priorAmountCents),
        share: shareOf(row.amountCents, totalCents),
      };
    })
    .sort(
      (left, right) =>
        right.amount - left.amount ||
        left.category.localeCompare(right.category),
    );
}

function categoryKey(categoryId: string | null): string {
  return categoryId ?? 'uncategorized';
}

function matchesPattern(
  pattern: RecurringPatternSnapshot,
  entry: MonthMerchantSpend,
): boolean {
  if (pattern.merchantId && entry.merchantId) {
    return pattern.merchantId === entry.merchantId;
  }
  return Boolean(entry.merchant) && entry.merchant === pattern.merchant;
}
