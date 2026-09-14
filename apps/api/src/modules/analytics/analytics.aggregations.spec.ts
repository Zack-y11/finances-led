import {
  buildCategoryBreakdown,
  buildMonthlySummary,
  centsFromDecimal,
  pickRepeatedSpendingInsight,
  previousMonthKey,
  shareOf,
  totalsFromCategoryRows,
} from './analytics.aggregations.js';

describe('analytics aggregations', () => {
  it('walks to the previous calendar month, including year boundaries', () => {
    expect(previousMonthKey('2026-07')).toBe('2026-06');
    expect(previousMonthKey('2026-01')).toBe('2025-12');
  });

  it('rounds decimal ledger amounts to cents before totaling', () => {
    const totals = totalsFromCategoryRows([
      {
        type: 'INCOME',
        categoryId: 'salary',
        amountCents: centsFromDecimal({ toString: () => '1200.00' }),
      },
      {
        type: 'EXPENSE',
        categoryId: 'food',
        amountCents: centsFromDecimal({ toString: () => '100.32' }),
      },
      {
        type: 'EXPENSE',
        categoryId: 'food',
        amountCents: centsFromDecimal({ toString: () => '45' }),
      },
      {
        type: 'EXPENSE',
        categoryId: 'transport',
        amountCents: centsFromDecimal({ toString: () => '87' }),
      },
      {
        type: 'ADJUSTMENT',
        categoryId: null,
        amountCents: centsFromDecimal({ toString: () => '999' }),
      },
    ]);

    expect(totals).toEqual({ incomeCents: 120000, expenseCents: 23232 });
  });

  it('builds a monthly summary whose net reconciles with income minus expenses', () => {
    const summary = buildMonthlySummary(
      '2026-07',
      { incomeCents: 120000, expenseCents: 23232 },
      { incomeCents: 110000, expenseCents: 4000 },
    );

    expect(summary.income).toBe(1200);
    expect(summary.expenses).toBe(232.32);
    expect(summary.net).toBe(967.68);
    expect(summary.net).toBeCloseTo(summary.income - summary.expenses, 10);
    expect(summary.priorMonth).toBe('2026-06');
    expect(summary.prior).toEqual({
      income: 1100,
      expenses: 40,
      net: 1060,
    });
    expect(summary.delta).toEqual({
      income: 100,
      expenses: 192.32,
      net: -92.32,
    });
  });

  it('groups category spend with prior-month trend and shares that sum to one', () => {
    const breakdown = buildCategoryBreakdown(
      '2026-07',
      [
        { type: 'EXPENSE', categoryId: 'food', amountCents: 14532 },
        { type: 'EXPENSE', categoryId: 'transport', amountCents: 8700 },
        { type: 'INCOME', categoryId: 'salary', amountCents: 120000 },
      ],
      [
        { type: 'EXPENSE', categoryId: 'food', amountCents: 4000 },
        { type: 'INCOME', categoryId: 'salary', amountCents: 110000 },
      ],
      new Map([
        ['food', 'Food'],
        ['transport', 'Transport'],
        ['salary', 'Salary'],
      ]),
    );

    expect(breakdown.totals).toEqual({
      income: 1200,
      expenses: 232.32,
      net: 967.68,
    });
    expect(
      breakdown.expenses.reduce((sum, item) => sum + item.amount, 0),
    ).toBeCloseTo(breakdown.totals.expenses, 10);
    expect(
      breakdown.income.reduce((sum, item) => sum + item.amount, 0),
    ).toBeCloseTo(breakdown.totals.income, 10);
    expect(breakdown.expenses.map((item) => item.category)).toEqual([
      'Food',
      'Transport',
    ]);
    expect(breakdown.expenses[0]).toEqual({
      categoryId: 'food',
      category: 'Food',
      amount: 145.32,
      priorAmount: 40,
      delta: 105.32,
      share: shareOf(14532, 23232),
    });
    expect(breakdown.expenses[1].priorAmount).toBe(0);
    expect(breakdown.expenses[1].delta).toBe(87);
    expect(
      breakdown.expenses.reduce((sum, item) => sum + item.share, 0),
    ).toBeCloseTo(1, 3);
  });

  it('labels missing categories as Uncategorized', () => {
    const breakdown = buildCategoryBreakdown(
      '2026-07',
      [{ type: 'EXPENSE', categoryId: null, amountCents: 1200 }],
      [],
      new Map(),
    );

    expect(breakdown.expenses).toEqual([
      {
        categoryId: null,
        category: 'Uncategorized',
        amount: 12,
        priorAmount: 0,
        delta: 12,
        share: 1,
      },
    ]);
  });

  it('picks the repeated expense that actually hit the selected month', () => {
    const insight = pickRepeatedSpendingInsight(
      [
        {
          merchant: 'Bus',
          merchantId: 'bus-id',
          type: 'expense',
          cadence: 'weekly',
          medianAmount: 5,
          occurrenceCount: 8,
          lastOccurredAt: '2026-07-28T12:00:00.000Z',
          active: true,
        },
        {
          merchant: 'Rent',
          merchantId: 'rent-id',
          type: 'expense',
          cadence: 'monthly',
          medianAmount: 900,
          occurrenceCount: 4,
          lastOccurredAt: '2026-06-01T12:00:00.000Z',
          active: true,
        },
      ],
      [
        { merchant: 'Bus', merchantId: 'bus-id', amountCents: 500 },
        { merchant: 'Bus', merchantId: 'bus-id', amountCents: 500 },
      ],
    );

    expect(insight).toEqual({
      kind: 'repeated_spending',
      merchant: 'Bus',
      merchantId: 'bus-id',
      cadence: 'weekly',
      medianAmount: 5,
      occurrenceCount: 8,
      lastOccurredAt: '2026-07-28T12:00:00.000Z',
      monthOccurrenceCount: 2,
      monthAmount: 10,
    });
  });

  it('falls back to the top active recurring expense when the month has no hits', () => {
    const insight = pickRepeatedSpendingInsight(
      [
        {
          merchant: 'Gym',
          merchantId: null,
          type: 'expense',
          cadence: 'monthly',
          medianAmount: 30,
          occurrenceCount: 3,
          lastOccurredAt: '2026-05-01T12:00:00.000Z',
          active: false,
        },
        {
          merchant: 'Rent',
          merchantId: null,
          type: 'expense',
          cadence: 'monthly',
          medianAmount: 900,
          occurrenceCount: 4,
          lastOccurredAt: '2026-06-01T12:00:00.000Z',
          active: true,
        },
      ],
      [],
    );

    expect(insight?.merchant).toBe('Rent');
    expect(insight?.monthOccurrenceCount).toBe(0);
    expect(insight?.monthAmount).toBe(0);
  });
});
