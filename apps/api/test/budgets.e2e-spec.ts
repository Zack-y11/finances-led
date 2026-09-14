import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createPrismaClient, type PrismaClient } from '@finance/database';
import type {
  AudioTranscriber,
  ReceiptParser,
  TextCommandParser,
} from '@finance/ai';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { AUDIO_TRANSCRIBER } from './../src/modules/ai-intake/audio-transcriber.provider.js';
import { RECEIPT_PARSER } from './../src/modules/ai-intake/receipt-parser.provider.js';
import { TEXT_COMMAND_PARSER } from './../src/modules/ai-intake/text-command-parser.provider.js';

describe('Budget endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let devUserId: string;
  let accountId: string;
  let categoryId: string;
  let otherAccountId: string;
  let otherCategoryId: string;

  const fixtureId = randomUUID();
  const month = '2199-07';
  const nextMonth = '2199-08';
  const budgetIds: string[] = [];
  const entryIds: string[] = [];

  const fakeTextCommandParser: TextCommandParser = {
    parseText(input) {
      return Promise.resolve({
        intent: 'create_ledger_entry',
        data: {
          type: 'expense',
          amount: 1,
          currency: 'USD',
          merchant: 'Budget test',
          account: 'Budget account',
          category: 'Budget category',
          occurredAt: input.referenceDate,
        },
        confidence: 0.94,
      });
    },
  };

  const fakeAudioTranscriber: AudioTranscriber = {
    transcribeAudio() {
      return Promise.resolve('budget test audio');
    },
  };

  const fakeReceiptParser: ReceiptParser = {
    parseReceipt(input) {
      return Promise.resolve({
        intent: 'create_ledger_entry',
        data: {
          type: 'expense',
          amount: 1,
          currency: 'USD',
          merchant: 'Budget test receipt',
          account: 'Budget account',
          category: 'Budget category',
          occurredAt: input.referenceDate,
        },
        confidence: 0.94,
      });
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TEXT_COMMAND_PARSER)
      .useValue(fakeTextCommandParser)
      .overrideProvider(AUDIO_TRANSCRIBER)
      .useValue(fakeAudioTranscriber)
      .overrideProvider(RECEIPT_PARSER)
      .useValue(fakeReceiptParser)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const databaseUrl = process.env.DATABASE_URL;
    const userId = process.env.DEV_USER_ID;
    if (!databaseUrl || !userId) {
      throw new Error(
        'DATABASE_URL and DEV_USER_ID are required for e2e tests',
      );
    }
    devUserId = userId;

    prisma = createPrismaClient(databaseUrl);
    await prisma.$connect();
    await prisma.user.findUniqueOrThrow({ where: { id: devUserId } });

    const [account, category, otherAccount, otherCategory] = await Promise.all([
      prisma.account.create({
        data: {
          userId: devUserId,
          name: `Budget account ${fixtureId}`,
          type: 'BANK',
        },
      }),
      prisma.category.create({
        data: {
          userId: devUserId,
          name: `Budget category ${fixtureId}`,
          kind: 'EXPENSE',
        },
      }),
      prisma.account.create({
        data: {
          userId: devUserId,
          name: `Other budget account ${fixtureId}`,
          type: 'CASH',
        },
      }),
      prisma.category.create({
        data: {
          userId: devUserId,
          name: `Other budget category ${fixtureId}`,
          kind: 'EXPENSE',
        },
      }),
    ]);

    accountId = account.id;
    categoryId = category.id;
    otherAccountId = otherAccount.id;
    otherCategoryId = otherCategory.id;
  });

  async function createBudget(input: {
    name: string;
    amount: number;
    alertThreshold?: number;
    categoryId?: string;
    accountId?: string;
  }) {
    const response = await request(app.getHttpServer())
      .post('/budgets')
      .send({
        period: 'monthly',
        ...input,
      })
      .expect(201);

    budgetIds.push(response.body.id);
    return response.body as {
      id: string;
      name: string;
      period: string;
      amount: number;
      alertThreshold: number;
    };
  }

  async function createLedgerEntry(input: {
    amount: number;
    monthKey: string;
    accountId?: string;
    categoryId?: string;
    status?: 'POSTED' | 'NEEDS_REVIEW';
  }) {
    const entry = await prisma.ledgerEntry.create({
      data: {
        userId: devUserId,
        accountId: input.accountId ?? accountId,
        categoryId: input.categoryId ?? categoryId,
        type: 'EXPENSE',
        amount: input.amount,
        currency: 'USD',
        merchant: `Budget fixture ${fixtureId}`,
        occurredAt: new Date(`${input.monthKey}-15T12:00:00.000Z`),
        monthKey: input.monthKey,
        inputMethod: 'MANUAL',
        status: input.status ?? 'POSTED',
      },
    });
    entryIds.push(entry.id);
    return entry;
  }

  function evaluationFor(
    body: unknown,
    budgetId: string,
  ): {
    monthKey: string;
    spent: number;
    remainingAmount: number;
    utilization: number;
    alertLevel: string | null;
    alertId: string | null;
  } {
    const budget = (body as Array<{ id: string; evaluation: unknown }>).find(
      (candidate) => candidate.id === budgetId,
    );
    if (!budget) throw new Error(`Budget ${budgetId} was not returned`);
    return budget.evaluation as {
      monthKey: string;
      spent: number;
      remainingAmount: number;
      utilization: number;
      alertLevel: string | null;
      alertId: string | null;
    };
  }

  it('supports budget CRUD through the documented collection routes', async () => {
    const name = `CRUD budget ${fixtureId}`;
    const created = await createBudget({
      name,
      amount: 100,
      categoryId,
      accountId,
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name,
        categoryId,
        accountId,
      }),
    );
    expect(String(created.period).toLowerCase()).toBe('monthly');
    expect(Number(created.amount)).toBe(100);
    expect(Number(created.alertThreshold)).toBe(0.8);

    const listed = await request(app.getHttpServer())
      .get(`/budgets?month=${month}`)
      .expect(200);
    const listedBudget = listed.body.find(
      (candidate: { id: string }) => candidate.id === created.id,
    );
    expect(listedBudget).toEqual(
      expect.objectContaining({
        id: created.id,
        categoryId,
        accountId,
        evaluation: expect.objectContaining({
          monthKey: month,
          spent: 0,
          remainingAmount: 100,
          utilization: 0,
          alertLevel: null,
        }),
      }),
    );

    const updated = await request(app.getHttpServer())
      .patch(`/budgets/${created.id}`)
      .send({ name: `${name} updated`, amount: 125 })
      .expect(200);
    expect(updated.body).toEqual(
      expect.objectContaining({
        id: created.id,
        name: `${name} updated`,
        categoryId,
        accountId,
      }),
    );
    expect(Number(updated.body.amount)).toBe(125);

    await request(app.getHttpServer())
      .delete(`/budgets/${created.id}`)
      .expect(200)
      .expect({ success: true, id: created.id });

    const afterDelete = await request(app.getHttpServer())
      .get(`/budgets?month=${month}`)
      .expect(200);
    expect(afterDelete.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );
  });

  it('evaluates monthKey and posted expense totals with category AND account scope', async () => {
    const budget = await createBudget({
      name: `Scoped budget ${fixtureId}`,
      amount: 100,
      alertThreshold: 0.8,
      categoryId,
      accountId,
    });

    await createLedgerEntry({ amount: 79.99, monthKey: month });
    await createLedgerEntry({
      amount: 100,
      monthKey: month,
      accountId: otherAccountId,
    });
    await createLedgerEntry({
      amount: 100,
      monthKey: month,
      categoryId: otherCategoryId,
    });
    await createLedgerEntry({
      amount: 100,
      monthKey: month,
      status: 'NEEDS_REVIEW',
    });
    await createLedgerEntry({ amount: 100, monthKey: nextMonth });

    const belowThreshold = await request(app.getHttpServer())
      .get(`/budgets?month=${month}`)
      .expect(200);
    expect(evaluationFor(belowThreshold.body, budget.id)).toEqual(
      expect.objectContaining({
        monthKey: month,
        spent: 79.99,
        alertLevel: null,
      }),
    );

    await createLedgerEntry({ amount: 0.01, monthKey: month });
    const atWarningThreshold = await request(app.getHttpServer())
      .get(`/budgets?month=${month}`)
      .expect(200);
    expect(evaluationFor(atWarningThreshold.body, budget.id)).toEqual(
      expect.objectContaining({
        monthKey: month,
        spent: 80,
        alertLevel: 'approaching',
      }),
    );

    const warningAlerts = await request(app.getHttpServer())
      .get(`/budgets/alerts?month=${month}`)
      .expect(200);
    expect(warningAlerts.body).toEqual([
      expect.objectContaining({
        budgetId: budget.id,
        budgetName: budget.name,
        monthKey: month,
        level: 'approaching',
        spent: 80,
        limitAmount: 100,
      }),
    ]);

    await createLedgerEntry({ amount: 20, monthKey: month });
    const atLimit = await request(app.getHttpServer())
      .get(`/budgets?month=${month}`)
      .expect(200);
    expect(evaluationFor(atLimit.body, budget.id)).toEqual(
      expect.objectContaining({
        monthKey: month,
        spent: 100,
        alertLevel: 'exceeded',
      }),
    );

    const exceededAlerts = await request(app.getHttpServer())
      .get(`/budgets/alerts?month=${month}`)
      .expect(200);
    expect(exceededAlerts.body).toEqual([
      expect.objectContaining({
        budgetId: budget.id,
        monthKey: month,
        level: 'exceeded',
        spent: 100,
        limitAmount: 100,
      }),
    ]);

    await createLedgerEntry({ amount: 0.01, monthKey: month });
    const overBudget = await request(app.getHttpServer())
      .get(`/budgets?month=${month}`)
      .expect(200);
    expect(evaluationFor(overBudget.body, budget.id)).toEqual(
      expect.objectContaining({
        monthKey: month,
        spent: 100.01,
        remainingAmount: expect.closeTo(-0.01, 10),
        alertLevel: 'exceeded',
      }),
    );

    const overBudgetAlerts = await request(app.getHttpServer())
      .get(`/budgets/alerts?month=${month}`)
      .expect(200);
    expect(overBudgetAlerts.body).toEqual([
      expect.objectContaining({
        budgetId: budget.id,
        monthKey: month,
        level: 'exceeded',
      }),
    ]);
    expect(
      await prisma.budgetAlert.count({ where: { budgetId: budget.id } }),
    ).toBe(2);
  });

  it('validates the month query used by budget and alert evaluation', async () => {
    await request(app.getHttpServer())
      .get('/budgets?month=2199-13')
      .expect(400);
    await request(app.getHttpServer())
      .get('/budgets/alerts?month=not-a-month')
      .expect(400);
  });

  afterAll(async () => {
    if (!prisma) {
      await app?.close();
      return;
    }

    try {
      const budgetAlertIds = budgetIds.length
        ? (
            await prisma.budgetAlert.findMany({
              where: { budgetId: { in: budgetIds } },
              select: { id: true },
            })
          ).map((alert) => alert.id)
        : [];

      if (budgetIds.length || budgetAlertIds.length) {
        await prisma.auditLog.deleteMany({
          where: {
            OR: [
              ...(budgetIds.length
                ? [{ entityType: 'Budget', entityId: { in: budgetIds } }]
                : []),
              ...(budgetAlertIds.length
                ? [
                    {
                      entityType: 'BudgetAlert',
                      entityId: { in: budgetAlertIds },
                    },
                  ]
                : []),
            ],
          },
        });
        await prisma.budget.deleteMany({ where: { id: { in: budgetIds } } });
      }

      if (entryIds.length) {
        await prisma.ledgerEntry.deleteMany({
          where: { id: { in: entryIds } },
        });
      }
      await prisma.account.deleteMany({
        where: { id: { in: [accountId, otherAccountId] } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: [categoryId, otherCategoryId] } },
      });
    } finally {
      await prisma.$disconnect();
      await app?.close();
    }
  });
});
