import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  createPrismaClient,
  type PrismaClient,
  Prisma,
} from '@finance/database';
import { analyticsGroupBreakdownSchema } from '@finance/contracts';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { TEXT_COMMAND_PARSER } from '../src/modules/ai-intake/text-command-parser.provider.js';
import { AUDIO_TRANSCRIBER } from '../src/modules/ai-intake/audio-transcriber.provider.js';
import { RECEIPT_PARSER } from '../src/modules/ai-intake/receipt-parser.provider.js';

describe('Phase 7 reporting (e2e)', () => {
  const month = '2197-01';
  const fixture = randomUUID();
  const entryIds: string[] = [];
  const budgetIds: string[] = [];
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaClient;
  let userId: string;
  let foreignUserId: string;
  let accountId: string;
  let categoryId: string;
  let groupId: string;
  let merchantId: string;
  const unexpectedAiCall = () => {
    throw new Error('Reporting must not call AI');
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TEXT_COMMAND_PARSER)
      .useValue({ parseText: unexpectedAiCall })
      .overrideProvider(AUDIO_TRANSCRIBER)
      .useValue({ transcribeAudio: unexpectedAiCall })
      .overrideProvider(RECEIPT_PARSER)
      .useValue({ parseReceipt: unexpectedAiCall })
      .compile();
    app = module.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
    userId = process.env.DEV_USER_ID!;
    prisma = createPrismaClient(process.env.DATABASE_URL!);
    await prisma.$connect();
    accountId = (
      await prisma.account.create({
        data: { userId, name: `Report account ${fixture}`, type: 'CASH' },
      })
    ).id;
    categoryId = (
      await prisma.category.create({
        data: { userId, name: `Report category ${fixture}`, kind: 'BOTH' },
      })
    ).id;
    groupId = (
      await prisma.entryGroup.create({
        data: { userId, name: `Report group ${fixture}`, type: 'MIXED' },
      })
    ).id;
    merchantId = (
      await prisma.merchant.create({
        data: {
          userId,
          displayName: `Export proof ${fixture}`,
          normalizedKey: `export proof ${fixture}`,
        },
      })
    ).id;
    foreignUserId = (
      await prisma.user.create({
        data: { email: `foreign-report-${fixture}@example.test` },
      })
    ).id;

    const makeEntry = (
      overrides: Partial<Prisma.LedgerEntryUncheckedCreateInput> = {},
    ): Prisma.LedgerEntryUncheckedCreateInput => {
      const id = randomUUID();
      entryIds.push(id);
      return {
        id,
        userId,
        accountId,
        categoryId,
        groupId,
        merchantId,
        merchant: `Export proof ${fixture}`,
        type: 'EXPENSE',
        amount: '0.10',
        currency: 'USD',
        status: 'POSTED',
        occurredAt: new Date(`${month}-15T12:00:00Z`),
        monthKey: month,
        ...overrides,
      };
    };
    await prisma.ledgerEntry.createMany({
      data: [
        ...Array.from({ length: 105 }, (_, index) =>
          makeEntry({
            note: index === 0 ? '=formula, "quoted"\nsecond line' : null,
          }),
        ),
        makeEntry({ type: 'INCOME', amount: 5, merchant: 'Income' }),
        makeEntry({ amount: '0.20', groupId: null, merchant: 'Ungrouped' }),
        makeEntry({ amount: 99, type: 'ADJUSTMENT' }),
        makeEntry({ amount: 50, status: 'NEEDS_REVIEW' }),
        makeEntry({ amount: 70, status: 'IGNORED' }),
        makeEntry({ amount: 80, currency: 'EUR' }),
        makeEntry({
          amount: 2,
          monthKey: '2196-12',
          occurredAt: new Date('2196-12-31T23:59:59Z'),
        }),
        ...(['USD', 'EUR'] as const).flatMap((currency) =>
          [9, 10, 11].map((monthNumber) =>
            makeEntry({
              amount: currency === 'USD' ? 10 : 20,
              currency,
              merchant: `Currency split ${fixture}`,
              merchantId: null,
              groupId: null,
              occurredAt: new Date(
                `2196-${String(monthNumber).padStart(2, '0')}-01T12:00:00Z`,
              ),
              monthKey: `2196-${String(monthNumber).padStart(2, '0')}`,
            }),
          ),
        ),
        makeEntry({
          userId: foreignUserId,
          accountId: null,
          categoryId: null,
          groupId: null,
          merchantId: null,
          amount: 600,
        }),
      ],
    });
    for (const budget of [
      { name: `Account budget ${fixture}`, amount: 10, accountId },
      { name: `Category budget ${fixture}`, amount: 20, categoryId },
    ]) {
      budgetIds.push(
        (
          await prisma.budget.create({
            data: { userId, period: 'MONTHLY', alertThreshold: 0.8, ...budget },
          })
        ).id,
      );
    }
  });

  it('reconciles posted USD summaries, categories, groups, and history across a year boundary', async () => {
    const summary = await request(httpServer)
      .get(`/analytics/monthly-summary?month=${month}`)
      .expect(200);
    expect(summary.body).toMatchObject({
      income: 5,
      expenses: 10.7,
      net: -5.7,
      priorMonth: '2196-12',
      prior: { income: 0, expenses: 2, net: -2 },
    });
    const breakdown = await request(httpServer)
      .get(`/analytics/monthly-breakdown?month=${month}`)
      .expect(200);
    expect(breakdown.body.totals).toEqual({
      income: 5,
      expenses: 10.7,
      net: -5.7,
    });
    expect(breakdown.body.expenses).toEqual([
      expect.objectContaining({ categoryId, amount: 10.7 }),
    ]);
    const groups = await request(httpServer)
      .get(`/analytics/group-breakdown?month=${month}`)
      .expect(200);
    expect(analyticsGroupBreakdownSchema.safeParse(groups.body).success).toBe(
      true,
    );
    expect(groups.body).toEqual({
      month,
      totals: breakdown.body.totals,
      groups: [
        {
          groupId,
          groupName: `Report group ${fixture}`,
          income: 5,
          expenses: 10.5,
          net: -5.5,
          transactionCount: 106,
        },
        {
          groupId: null,
          groupName: 'Ungrouped',
          income: 0,
          expenses: 0.2,
          net: -0.2,
          transactionCount: 1,
        },
      ],
    });
    const history = await request(httpServer)
      .get('/analytics/net-history')
      .expect(200);
    expect(history.body).toContainEqual({
      month,
      income: 5,
      expenses: 10.7,
      net: -5.7,
    });
    const ungrouped = await request(httpServer)
      .get('/ledger-entries')
      .query({
        month,
        status: 'posted',
        currency: 'USD',
        financialOnly: 'true',
        ungrouped: 'true',
      })
      .expect(200);
    expect(ungrouped.body.pagination.total).toBe(1);
    expect(ungrouped.body.data[0].amount).toBe('0.2');
  });

  it('evaluates overlapping account and category budgets independently from posted USD spending', async () => {
    const response = await request(httpServer)
      .get(`/budgets?month=${month}`)
      .expect(200);
    const budgets = response.body as Array<{
      id: string;
      evaluation: {
        spent: number;
        remainingAmount: number;
        alertLevel: string | null;
      };
    }>;
    expect(
      budgets.find((b) => b.id === budgetIds[0])?.evaluation,
    ).toMatchObject({
      spent: 10.7,
      remainingAmount: -0.7,
      alertLevel: 'exceeded',
    });
    expect(
      budgets.find((b) => b.id === budgetIds[1])?.evaluation,
    ).toMatchObject({ spent: 10.7, remainingAmount: 9.3, alertLevel: null });
  });

  it('keeps recurring pattern amounts separate for each currency', async () => {
    const response = await request(httpServer)
      .get('/recurring-patterns')
      .expect(200);
    expect(
      response.body.data
        .filter((pattern: { merchant: string }) =>
          pattern.merchant.includes(`Currency split ${fixture}`),
        )
        .map((pattern: { currency: string; medianAmount: number }) => ({
          currency: pattern.currency,
          medianAmount: pattern.medianAmount,
        }))
        .sort((left: { currency: string }, right: { currency: string }) =>
          left.currency.localeCompare(right.currency),
        ),
    ).toEqual([
      { currency: 'EUR', medianAmount: 20 },
      { currency: 'USD', medianAmount: 10 },
    ]);
  });

  it('assigns ledger month keys from the stored UTC timestamp on create and update', async () => {
    const created = await request(httpServer)
      .post('/ledger-entries')
      .send({
        type: 'expense',
        amount: 1,
        currency: 'USD',
        merchant: `UTC boundary ${fixture}`,
        occurredAt: '2198-01-01T00:30:00+14:00',
        categoryId,
        accountId,
        inputMethod: 'manual',
      })
      .expect(201);
    entryIds.push(created.body.id);
    expect(created.body.occurredAt).toBe('2197-12-31T10:30:00.000Z');
    expect(created.body.monthKey).toBe('2197-12');

    const updated = await request(httpServer)
      .patch(`/ledger-entries/${created.body.id}`)
      .send({ occurredAt: '2197-12-31T23:30:00-02:00' })
      .expect(200);
    expect(updated.body.occurredAt).toBe('2198-01-01T01:30:00.000Z');
    expect(updated.body.monthKey).toBe('2198-01');
  });

  it('exports every filtered row across pagination with a stable order and original facts', async () => {
    const query = {
      month,
      type: 'expense',
      status: 'posted',
      currency: 'USD',
      accountId,
      categoryId,
      groupId,
      merchantId,
      search: `Export proof ${fixture}`,
    };
    const page = await request(httpServer)
      .get('/ledger-entries')
      .query({ ...query, pageSize: 100 })
      .expect(200);
    expect(page.body.pagination).toMatchObject({ total: 105, totalPages: 2 });
    const csv = await request(httpServer)
      .get('/ledger-entries/export.csv')
      .query({ ...query, page: 2, pageSize: 20 })
      .expect(200)
      .expect('Content-Type', /text\/csv/)
      .expect('Content-Disposition', /attachment/);
    expect(csv.text.match(/"expense",0\.10/g)).toHaveLength(105);
    expect(csv.text.split('\r\n')[1]).toContain(page.body.data[0].id);
    expect(csv.text).toContain('"\'=formula, ""quoted""\nsecond line"');
    const all = await request(httpServer)
      .get('/ledger-entries/export.csv')
      .query({ month, accountId })
      .expect(200);
    expect(all.text).toContain('"EUR"');
    expect(all.text).toContain('"needs_review"');
    expect(all.text).toContain('"ignored"');
    expect(all.text).not.toContain(',600.00,');
  });

  it('handles empty results and validates all report/export queries', async () => {
    const empty = await request(httpServer)
      .get('/analytics/group-breakdown?month=2197-02')
      .expect(200);
    expect(empty.body).toEqual({
      month: '2197-02',
      groups: [],
      totals: { income: 0, expenses: 0, net: 0 },
    });
    const csv = await request(httpServer)
      .get('/ledger-entries/export.csv?month=2197-02')
      .expect(200);
    expect(csv.text.split('\r\n')).toHaveLength(2);
    for (const query of [
      'month=2197-13',
      'startDate=2197-02-31',
      'status=broken',
      'currency=usd',
      'groupId=invalid',
    ]) {
      await request(httpServer)
        .get(`/ledger-entries/export.csv?${query}`)
        .expect(400);
    }
    await request(httpServer).get('/analytics/group-breakdown').expect(400);
    await request(httpServer).get('/entry-groups/not-a-uuid').expect(400);
    await request(httpServer)
      .post('/entry-groups/not-a-uuid/entries')
      .send({
        type: 'expense',
        amount: 1,
        currency: 'USD',
        occurredAt: `${month}-10T12:00:00.000Z`,
        categoryId,
        accountId,
      })
      .expect(400);
    await request(httpServer).get('/review-items?status=unknown').expect(400);
    const postedReviews = await request(httpServer)
      .get('/review-items?status=posted')
      .expect(200);
    expect(
      postedReviews.body.data.every(
        (entry: { status: string }) => entry.status === 'POSTED',
      ),
    ).toBe(true);
  });

  afterAll(async () => {
    if (prisma) {
      try {
        const alerts = await prisma.budgetAlert.findMany({
          where: { budgetId: { in: budgetIds } },
          select: { id: true },
        });
        await prisma.auditLog.deleteMany({
          where: {
            entityId: { in: [...budgetIds, ...alerts.map((a) => a.id)] },
          },
        });
        await prisma.budget.deleteMany({ where: { id: { in: budgetIds } } });
        await prisma.ledgerEntry.deleteMany({
          where: { id: { in: entryIds } },
        });
        if (merchantId)
          await prisma.merchant.delete({ where: { id: merchantId } });
        if (groupId) await prisma.entryGroup.delete({ where: { id: groupId } });
        if (categoryId)
          await prisma.category.delete({ where: { id: categoryId } });
        if (accountId)
          await prisma.account.delete({ where: { id: accountId } });
        if (foreignUserId)
          await prisma.user.delete({ where: { id: foreignUserId } });
      } finally {
        await prisma.$disconnect();
      }
    }
    await app?.close();
  });
});
