import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { RecurringPatternsService } from '../rules/recurring-patterns.service.js';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService', () => {
  const amount = (value: string) => ({ toString: () => value });
  const foodId = '11111111-1111-4111-8111-111111111111';
  const salaryId = '22222222-2222-4222-8222-222222222222';
  let monthRows: Record<string, unknown[]> = {};
  let historyRows: unknown[] = [];
  let categoryResult: unknown[] = [];
  let monthEntries: unknown[] = [];
  let predictionEntries: unknown[] = [];
  let recurringPatterns: unknown[] = [];
  const groupByInputs: unknown[] = [];
  let lastFindManyInput: unknown;
  const prisma = {
    db: {
      ledgerEntry: {
        groupBy: (input: { by: string[]; where?: { monthKey?: string } }) => {
          groupByInputs.push(input);
          if (input.by.includes('monthKey')) {
            return Promise.resolve(historyRows);
          }
          return Promise.resolve(monthRows[input.where?.monthKey ?? ''] ?? []);
        },
        findMany: (input: { where?: { monthKey?: string } }) => {
          lastFindManyInput = input;
          if (input.where?.monthKey) {
            return Promise.resolve(monthEntries);
          }
          return Promise.resolve(predictionEntries);
        },
      },
      category: {
        findMany: () => Promise.resolve(categoryResult),
      },
    },
  } as unknown as PrismaService;
  const recurringPatternsService = {
    findAll: () => Promise.resolve({ data: recurringPatterns }),
  } as unknown as RecurringPatternsService;
  const config = {
    getOrThrow: () => 'configured-user-id',
  } as unknown as ConfigService;
  let service: AnalyticsService;

  beforeEach(() => {
    monthRows = {};
    historyRows = [];
    categoryResult = [];
    monthEntries = [];
    predictionEntries = [];
    recurringPatterns = [];
    groupByInputs.length = 0;
    lastFindManyInput = undefined;
    service = new AnalyticsService(prisma, recurringPatternsService, config);
  });

  it('calculates income, expenses, net, and prior-month delta', async () => {
    monthRows['2026-07'] = [
      {
        type: 'INCOME',
        categoryId: salaryId,
        _sum: { amount: amount('1200.00') },
      },
      {
        type: 'EXPENSE',
        categoryId: foodId,
        _sum: { amount: amount('486.42') },
      },
    ];
    monthRows['2026-06'] = [
      {
        type: 'EXPENSE',
        categoryId: foodId,
        _sum: { amount: amount('40.00') },
      },
    ];

    await expect(service.monthlySummary('2026-07')).resolves.toEqual({
      month: '2026-07',
      income: 1200,
      expenses: 486.42,
      net: 713.58,
      priorMonth: '2026-06',
      prior: { income: 0, expenses: 40, net: -40 },
      delta: { income: 1200, expenses: 446.42, net: 753.58 },
    });
    expect(groupByInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          by: ['type', 'categoryId'],
          where: expect.objectContaining({
            userId: 'configured-user-id',
            monthKey: '2026-07',
            type: { in: ['INCOME', 'EXPENSE'] },
          }),
        }),
        expect.objectContaining({
          where: expect.objectContaining({ monthKey: '2026-06' }),
        }),
      ]),
    );
  });

  it('groups monthly income and expenses by category with prior trend', async () => {
    monthRows['2026-07'] = [
      {
        type: 'EXPENSE',
        categoryId: 'transport-id',
        _sum: { amount: amount('87.00') },
      },
      {
        type: 'EXPENSE',
        categoryId: 'food-id',
        _sum: { amount: amount('145.32') },
      },
      { type: 'EXPENSE', categoryId: null, _sum: { amount: amount('12.00') } },
      {
        type: 'INCOME',
        categoryId: 'salary-id',
        _sum: { amount: amount('3000.00') },
      },
      {
        type: 'INCOME',
        categoryId: 'bonus-id',
        _sum: { amount: amount('500.00') },
      },
    ];
    categoryResult = [
      { id: 'bonus-id', name: 'Bonus' },
      { id: 'food-id', name: 'Food' },
      { id: 'salary-id', name: 'Salary' },
      { id: 'transport-id', name: 'Transport' },
    ];

    const breakdown = await service.monthlyBreakdown('2026-07');
    expect(breakdown.expenses.map((item) => item.category)).toEqual([
      'Food',
      'Transport',
      'Uncategorized',
    ]);
    expect(breakdown.income.map((item) => item.category)).toEqual([
      'Salary',
      'Bonus',
    ]);
    expect(
      breakdown.expenses.reduce((sum, item) => sum + item.amount, 0),
    ).toBeCloseTo(breakdown.totals.expenses, 10);
    expect(
      breakdown.income.reduce((sum, item) => sum + item.amount, 0),
    ).toBeCloseTo(breakdown.totals.income, 10);
  });

  it('returns empty arrays for an empty monthly breakdown', async () => {
    await expect(service.monthlyBreakdown('2026-08')).resolves.toEqual({
      month: '2026-08',
      priorMonth: '2026-07',
      totals: { income: 0, expenses: 0, net: 0 },
      priorTotals: { income: 0, expenses: 0, net: 0 },
      expenses: [],
      income: [],
    });
  });

  it('returns chronological monthly net history', async () => {
    historyRows = [
      {
        monthKey: '2026-06',
        type: 'EXPENSE',
        _sum: { amount: amount('50.00') },
      },
      {
        monthKey: '2026-07',
        type: 'INCOME',
        _sum: { amount: amount('1200.00') },
      },
      {
        monthKey: '2026-07',
        type: 'EXPENSE',
        _sum: { amount: amount('486.42') },
      },
    ];

    await expect(service.netHistory()).resolves.toEqual([
      { month: '2026-06', income: 0, expenses: 50, net: -50 },
      { month: '2026-07', income: 1200, expenses: 486.42, net: 713.58 },
    ]);
  });

  it('projects a posted-entry monthly close with DEV_USER_ID scoping', async () => {
    predictionEntries = [
      {
        id: 'income-entry',
        type: 'INCOME',
        amount: amount('1000.00'),
        merchant: 'Salary',
        merchantId: null,
        occurredAt: new Date('2026-07-05T12:00:00.000Z'),
      },
      {
        id: 'expense-entry',
        type: 'EXPENSE',
        amount: amount('100.00'),
        merchant: 'Groceries',
        merchantId: null,
        occurredAt: new Date('2026-07-05T12:00:00.000Z'),
      },
    ];

    await expect(
      service.monthlyClosePrediction('2026-07', '2026-07-10'),
    ).resolves.toEqual(
      expect.objectContaining({
        month: '2026-07',
        asOf: '2026-07-10',
        actual: { income: 1000, expenses: 100, net: 900 },
        forecast: { income: 1000, expenses: 310, net: 690 },
      }),
    );
    expect(lastFindManyInput).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'configured-user-id',
          status: 'POSTED',
          type: { in: ['INCOME', 'EXPENSE'] },
        }),
      }),
    );
  });

  it('includes a repeated-spending insight in the monthly overview', async () => {
    monthRows['2026-07'] = [
      {
        type: 'EXPENSE',
        categoryId: foodId,
        _sum: { amount: amount('10.00') },
      },
    ];
    recurringPatterns = [
      {
        merchant: 'Bus',
        merchantId: 'bus-id',
        type: 'expense',
        cadence: 'weekly',
        medianAmount: 5,
        occurrenceCount: 4,
        lastOccurredAt: '2026-07-21T12:00:00.000Z',
        active: true,
      },
    ];
    monthEntries = [
      {
        merchant: 'Bus',
        merchantId: 'bus-id',
        amount: amount('5.00'),
      },
      {
        merchant: 'Bus',
        merchantId: 'bus-id',
        amount: amount('5.00'),
      },
    ];

    const overview = await service.monthlyOverview('2026-07');
    expect(overview.summary.expenses).toBe(10);
    expect(overview.breakdown.totals.expenses).toBe(10);
    expect(overview.insight).toEqual({
      kind: 'repeated_spending',
      merchant: 'Bus',
      merchantId: 'bus-id',
      cadence: 'weekly',
      medianAmount: 5,
      occurrenceCount: 4,
      lastOccurredAt: '2026-07-21T12:00:00.000Z',
      monthOccurrenceCount: 2,
      monthAmount: 10,
    });
  });
});
