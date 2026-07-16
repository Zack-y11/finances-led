import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService', () => {
  const amount = (value: string) => ({ toString: () => value });
  let groupByResult: unknown[] = [];
  let categoryResult: unknown[] = [];
  let lastGroupByInput: unknown;
  const prisma = {
    db: {
      ledgerEntry: {
        groupBy: (input: unknown) => {
          lastGroupByInput = input;
          return Promise.resolve(groupByResult);
        },
      },
      category: {
        findMany: () => Promise.resolve(categoryResult),
      },
    },
  } as unknown as PrismaService;
  const config = {
    getOrThrow: () => 'configured-user-id',
  } as unknown as ConfigService;
  let service: AnalyticsService;

  beforeEach(() => {
    groupByResult = [];
    categoryResult = [];
    lastGroupByInput = undefined;
    service = new AnalyticsService(prisma, config);
  });

  it('calculates income, expenses, and net for a month', async () => {
    groupByResult = [
      { type: 'INCOME', _sum: { amount: amount('1200.00') } },
      { type: 'EXPENSE', _sum: { amount: amount('486.42') } },
    ];

    await expect(service.monthlySummary('2026-07')).resolves.toEqual({
      month: '2026-07',
      income: 1200,
      expenses: 486.42,
      net: 713.58,
    });
    expect(lastGroupByInput).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'configured-user-id',
          monthKey: '2026-07',
          type: { in: ['INCOME', 'EXPENSE'] },
        }),
      }),
    );
  });

  it('groups monthly expenses by category and sorts by amount', async () => {
    groupByResult = [
      { categoryId: 'transport-id', _sum: { amount: amount('87.00') } },
      { categoryId: 'food-id', _sum: { amount: amount('145.32') } },
      { categoryId: null, _sum: { amount: amount('12.00') } },
    ];
    categoryResult = [
      { id: 'food-id', name: 'Food' },
      { id: 'transport-id', name: 'Transport' },
    ];

    await expect(service.monthlyBreakdown('2026-07')).resolves.toEqual({
      expenses: [
        { category: 'Food', amount: 145.32 },
        { category: 'Transport', amount: 87 },
        { category: 'Uncategorized', amount: 12 },
      ],
    });
  });

  it('returns chronological monthly net history', async () => {
    groupByResult = [
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
});
