import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { BudgetsService } from './budgets.service.js';

type AlertLevel = 'APPROACHING' | 'EXCEEDED';

type BudgetFixture = {
  id: string;
  userId: string;
  name: string;
  period: 'MONTHLY';
  amount: string;
  alertThreshold: string;
  categoryId: string | null;
  accountId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string } | null;
  account: { id: string; name: string } | null;
};

type AlertFixture = {
  id: string;
  userId: string;
  budgetId: string;
  monthKey: string;
  level: AlertLevel;
  spent: number;
  limitAmount: number;
  raisedAt: Date;
};

describe('BudgetsService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const categoryId = '22222222-2222-4222-8222-222222222222';
  const accountId = '33333333-3333-4333-8333-333333333333';
  const budgetId = '44444444-4444-4444-8444-444444444444';
  const month = '2199-07';
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  const budget: BudgetFixture = {
    id: budgetId,
    userId,
    name: 'Monthly groceries',
    period: 'MONTHLY',
    amount: '100.00',
    alertThreshold: '0.80',
    categoryId,
    accountId,
    createdAt,
    updatedAt: createdAt,
    category: { id: categoryId, name: 'Groceries' },
    account: { id: accountId, name: 'Checking' },
  };

  let aggregateAmount: string;
  let budgets: BudgetFixture[] = [];
  let alerts: Map<string, AlertFixture> = new Map();
  let service: BudgetsService;

  const budgetFindMany =
    jest.fn<(input: unknown) => Promise<BudgetFixture[]>>();
  const budgetFindFirst = jest.fn<(input: unknown) => Promise<BudgetFixture>>();
  const budgetCreate = jest.fn<(input: unknown) => Promise<BudgetFixture>>();
  const budgetUpdate =
    jest.fn<(input: unknown) => Promise<{ count: number }>>();
  const budgetDelete =
    jest.fn<(input: unknown) => Promise<{ count: number }>>();
  const aggregate =
    jest.fn<(input: unknown) => Promise<{ _sum: { amount: string } }>>();
  const budgetAlertFindFirst =
    jest.fn<
      (input: {
        where: { budgetId: string; monthKey: string; level: AlertLevel };
      }) => Promise<AlertFixture | null>
    >();
  const budgetAlertCreate =
    jest.fn<
      (input: {
        data: Omit<AlertFixture, 'id' | 'raisedAt'>;
      }) => Promise<AlertFixture>
    >();
  const auditLogCreate = jest.fn<(input: unknown) => Promise<unknown>>();
  const categoryFindFirst =
    jest.fn<(input: unknown) => Promise<{ id: string } | null>>();
  const accountFindFirst =
    jest.fn<(input: unknown) => Promise<{ id: string } | null>>();

  const alertKey = (input: {
    budgetId: string;
    monthKey: string;
    level: AlertLevel;
  }) => `${input.budgetId}:${input.monthKey}:${input.level}`;

  const transaction = {
    budget: {
      create: budgetCreate,
      findFirst: budgetFindFirst,
      updateMany: budgetUpdate,
      deleteMany: budgetDelete,
    },
    budgetAlert: {
      create: budgetAlertCreate,
    },
    auditLog: {
      create: auditLogCreate,
    },
  };

  const prisma = {
    db: {
      budget: {
        findMany: budgetFindMany,
        findFirst: budgetFindFirst,
      },
      category: {
        findFirst: categoryFindFirst,
      },
      account: {
        findFirst: accountFindFirst,
      },
      ledgerEntry: {
        aggregate,
      },
      budgetAlert: {
        findFirst: budgetAlertFindFirst,
        findFirstOrThrow: budgetAlertFindFirst,
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (tx: typeof transaction) => unknown) =>
          callback(transaction),
        ),
    },
  } as unknown as PrismaService;

  const config = {
    getOrThrow: () => userId,
  } as unknown as ConfigService;

  beforeEach(() => {
    aggregateAmount = '0.00';
    budgets = [budget];
    alerts = new Map();
    budgetFindMany
      .mockReset()
      .mockImplementation(() => Promise.resolve(budgets));
    budgetFindFirst.mockReset().mockResolvedValue(budget);
    budgetCreate.mockReset().mockResolvedValue(budget);
    budgetUpdate.mockReset().mockResolvedValue({ count: 1 });
    budgetDelete.mockReset().mockResolvedValue({ count: 1 });
    aggregate
      .mockReset()
      .mockImplementation(() =>
        Promise.resolve({ _sum: { amount: aggregateAmount } }),
      );
    budgetAlertFindFirst
      .mockReset()
      .mockImplementation(({ where }) =>
        Promise.resolve(alerts.get(alertKey(where)) ?? null),
      );
    budgetAlertCreate.mockReset().mockImplementation(({ data }) => {
      const alert: AlertFixture = {
        ...data,
        id: '55555555-5555-4555-8555-555555555555',
        raisedAt: new Date('2026-01-02T00:00:00.000Z'),
      };
      alerts.set(alertKey(alert), alert);
      return Promise.resolve(alert);
    });
    auditLogCreate.mockReset().mockResolvedValue({});
    categoryFindFirst.mockReset().mockResolvedValue({ id: categoryId });
    accountFindFirst.mockReset().mockResolvedValue({ id: accountId });
    service = new BudgetsService(prisma, config);
  });

  it.each([
    { spent: 79.99, alertLevel: null, databaseLevel: undefined },
    { spent: 80, alertLevel: 'approaching', databaseLevel: 'APPROACHING' },
    { spent: 100, alertLevel: 'exceeded', databaseLevel: 'EXCEEDED' },
    { spent: 100.01, alertLevel: 'exceeded', databaseLevel: 'EXCEEDED' },
  ] as const)(
    'evaluates the exact $spent threshold boundary as $alertLevel',
    async ({ spent, alertLevel, databaseLevel }) => {
      aggregateAmount = spent.toFixed(2);

      const [result] = await service.findAll(month);

      expect(result?.evaluation).toEqual(
        expect.objectContaining({
          budgetId,
          monthKey: month,
          spent,
          limitAmount: 100,
          remainingAmount: expect.closeTo(100 - spent, 10),
          alertLevel,
          utilization: spent / 100,
        }),
      );

      if (databaseLevel) {
        expect(budgetAlertCreate).toHaveBeenCalledWith({
          data: expect.objectContaining({
            budgetId,
            monthKey: month,
            level: databaseLevel,
            spent,
            limitAmount: 100,
          }),
        });
      } else {
        expect(budgetAlertCreate).not.toHaveBeenCalled();
      }
    },
  );

  it('counts only posted expenses in the requested month matching both scope dimensions', async () => {
    aggregateAmount = '75.00';

    const [result] = await service.findAll(month);

    expect(aggregate).toHaveBeenCalledWith({
      where: {
        userId,
        monthKey: month,
        type: 'EXPENSE',
        status: 'POSTED',
        categoryId,
        accountId,
      },
      _sum: { amount: true },
    });
    expect(result?.evaluation).toEqual(
      expect.objectContaining({
        budgetId,
        monthKey: month,
        spent: 75,
        limitAmount: 100,
        remainingAmount: 25,
        alertLevel: null,
      }),
    );
  });

  it('raises each alert level once and returns the current alert for the month', async () => {
    aggregateAmount = '80.00';

    const firstEvaluation = (await service.findAll(month))[0];
    const secondEvaluation = (await service.findAll(month))[0];
    const alertsResponse = await service.findAlerts(month);

    expect(budgetAlertCreate).toHaveBeenCalledTimes(1);
    expect(secondEvaluation?.evaluation.alertId).toBe(
      firstEvaluation?.evaluation.alertId,
    );
    expect(alertsResponse).toEqual([
      expect.objectContaining({
        id: firstEvaluation?.evaluation.alertId,
        budgetId,
        monthKey: month,
        level: 'approaching',
        spent: 80,
        limitAmount: 100,
        userId,
      }),
    ]);
  });

  it('supports scoped budget CRUD and rejects an unscoped budget', async () => {
    await expect(
      service.create({
        name: 'Unscoped',
        period: 'monthly',
        amount: 100,
        alertThreshold: 0.8,
      }),
    ).rejects.toThrow('A budget must scope a category, account, or both');
    expect(budgetCreate).not.toHaveBeenCalled();

    const created = await service.create({
      name: 'Groceries',
      period: 'monthly',
      amount: 250,
      alertThreshold: 0.75,
      categoryId,
      accountId,
    });
    expect(created).toBe(budget);
    expect(budgetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId,
          name: 'Groceries',
          period: 'MONTHLY',
          amount: 250,
          alertThreshold: 0.75,
          categoryId,
          accountId,
        },
      }),
    );

    await service.update(budgetId, {
      name: 'Updated groceries',
      amount: 300,
      categoryId: null,
    });
    expect(budgetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: budgetId, userId },
        data: expect.objectContaining({
          name: 'Updated groceries',
          amount: 300,
          categoryId: null,
          accountId,
        }),
      }),
    );

    await expect(service.remove(budgetId)).resolves.toEqual({
      success: true,
      id: budgetId,
    });
    expect(budgetDelete).toHaveBeenCalledWith({
      where: { id: budgetId, userId },
    });
    expect(auditLogCreate).toHaveBeenCalled();
  });
});
