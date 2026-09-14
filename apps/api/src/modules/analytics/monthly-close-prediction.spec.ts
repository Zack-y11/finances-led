import { monthlyClosePredictionSchema } from '@finance/contracts';

import { projectMonthlyClose } from './monthly-close-prediction.js';

describe('projectMonthlyClose', () => {
  it('returns a zero forecast for an empty month', () => {
    const result = projectMonthlyClose({
      month: '2026-07',
      asOf: new Date('2026-07-10T12:00:00.000Z'),
      entries: [],
    });

    expect(result).toEqual({
      month: '2026-07',
      asOf: '2026-07-10',
      daysInMonth: 31,
      elapsedDays: 10,
      remainingDays: 21,
      actual: { income: 0, expenses: 0, net: 0 },
      projectedRemaining: { income: 0, expenses: 0, net: 0 },
      forecast: { income: 0, expenses: 0, net: 0 },
      assumptions: {
        averageDailySpend: 0,
        projectedVariableSpend: 0,
        recurringIncomeStillDue: 0,
        recurringExpensesStillDue: 0,
        recurringStillDue: [],
      },
    });
    expect(monthlyClosePredictionSchema.parse(result)).toEqual(result);
  });

  it('carries income-only months through without inventing expenses', () => {
    const result = projectMonthlyClose({
      month: '2026-07',
      asOf: new Date('2026-07-10T12:00:00.000Z'),
      entries: [
        {
          type: 'INCOME',
          amountCents: 100_000,
          merchant: 'Salary',
          merchantId: null,
          occurredAt: new Date('2026-07-01T12:00:00.000Z'),
        },
      ],
    });

    expect(result.actual).toEqual({ income: 1000, expenses: 0, net: 1000 });
    expect(result.forecast).toEqual({ income: 1000, expenses: 0, net: 1000 });
    expect(result.assumptions.averageDailySpend).toBe(0);
  });

  it('stops projecting at the month boundary', () => {
    const result = projectMonthlyClose({
      month: '2026-07',
      asOf: new Date('2026-08-02T12:00:00.000Z'),
      entries: [
        {
          type: 'EXPENSE',
          amountCents: 10_000,
          merchant: 'Rent',
          merchantId: null,
          occurredAt: new Date('2026-07-31T12:00:00.000Z'),
        },
      ],
    });

    expect(result.asOf).toBe('2026-07-31');
    expect(result.elapsedDays).toBe(31);
    expect(result.remainingDays).toBe(0);
    expect(result.forecast).toEqual({ income: 0, expenses: 100, net: -100 });
  });

  it('adds recurring items still expected while keeping their posted rows out of the pace', () => {
    const result = projectMonthlyClose({
      month: '2026-07',
      asOf: new Date('2026-07-10T12:00:00.000Z'),
      entries: [
        {
          type: 'EXPENSE',
          amountCents: 1_250,
          merchant: 'Claro',
          merchantId: 'merchant-claro',
          occurredAt: new Date('2026-07-01T12:00:00.000Z'),
        },
        {
          type: 'EXPENSE',
          amountCents: 2_000,
          merchant: 'Groceries',
          merchantId: null,
          occurredAt: new Date('2026-07-05T12:00:00.000Z'),
        },
      ],
      recurringPatterns: [
        {
          merchant: 'Claro',
          merchantId: 'merchant-claro',
          type: 'expense',
          cadence: 'monthly',
          medianAmount: 12.5,
          occurrenceCount: 4,
          lastOccurredAt: '2026-06-01T00:00:00.000Z',
          nextExpectedAt: '2026-07-15T00:00:00.000Z',
          active: true,
          sampleEntryIds: ['one', 'two', 'three', 'four'],
        },
      ],
    });

    expect(result.assumptions).toEqual({
      averageDailySpend: 2,
      projectedVariableSpend: 42,
      recurringIncomeStillDue: 0,
      recurringExpensesStillDue: 12.5,
      recurringStillDue: [
        {
          merchant: 'Claro',
          type: 'expense',
          cadence: 'monthly',
          amount: 12.5,
          expectedDate: '2026-07-15',
        },
      ],
    });
    expect(result.forecast).toEqual({
      income: 0,
      expenses: 87,
      net: -87,
    });
  });
});
