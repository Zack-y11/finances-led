import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createPrismaClient, type PrismaClient } from '@finance/database';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('Ledger endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let accountId: string;
  let categoryId: string;
  let unownedAccountId: string;
  let unownedCategoryId: string;
  let unownedUserId: string;
  let createdEntryId: string | undefined;
  let createdGroupId: string | undefined;
  let groupedEntryId: string | undefined;
  let filterAccountId: string | undefined;
  let filterCategoryId: string | undefined;
  const filterEntryIds: string[] = [];
  const analyticsEntryIds: string[] = [];
  const analyticsCategoryIds: string[] = [];

  const fixtureId = randomUUID();
  const createInput = () => ({
    type: 'expense',
    amount: 3.19,
    currency: 'USD',
    merchant: 'E2E Coffee Shop',
    occurredAt: '2026-07-11T18:30:00.000Z',
    note: 'Created by the ledger e2e test',
    inputMethod: 'manual',
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const databaseUrl = process.env.DATABASE_URL;
    const userId = process.env.DEV_USER_ID;
    if (!databaseUrl || !userId) {
      throw new Error('DATABASE_URL and DEV_USER_ID are required for e2e tests');
    }

    prisma = createPrismaClient(databaseUrl);
    await prisma.$connect();
    await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const [account, category, unownedUser] = await Promise.all([
      prisma.account.create({
        data: {
          userId,
          name: `Ledger e2e account ${fixtureId}`,
          type: 'CASH',
        },
      }),
      prisma.category.create({
        data: {
          userId,
          name: `Ledger e2e category ${fixtureId}`,
          kind: 'EXPENSE',
        },
      }),
      prisma.user.create({
        data: { email: `ledger-e2e-${fixtureId}@example.test` },
      }),
    ]);

    accountId = account.id;
    categoryId = category.id;
    unownedUserId = unownedUser.id;

    const [unownedAccount, unownedCategory] = await Promise.all([
      prisma.account.create({
        data: {
          userId: unownedUserId,
          name: `Unowned e2e account ${fixtureId}`,
          type: 'CASH',
        },
      }),
      prisma.category.create({
        data: {
          userId: unownedUserId,
          name: `Unowned e2e category ${fixtureId}`,
          kind: 'EXPENSE',
        },
      }),
    ]);

    unownedAccountId = unownedAccount.id;
    unownedCategoryId = unownedCategory.id;
  });

  it('creates an entry, writes an audit log, and returns it from list and detail endpoints', async () => {
    const response = await request(app.getHttpServer())
      .post('/ledger-entries')
      .send({ ...createInput(), accountId, categoryId })
      .expect(201);

    createdEntryId = response.body.id;
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        accountId,
        categoryId,
        type: 'EXPENSE',
        monthKey: '2026-07',
      }),
    );

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityType: 'LedgerEntry',
        entityId: createdEntryId,
        action: 'CREATE',
      },
    });
    expect(auditLog).toEqual(
      expect.objectContaining({ metadata: { inputMethod: 'manual' } }),
    );

    const listResponse = await request(app.getHttpServer())
      .get('/ledger-entries')
      .expect(200);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdEntryId })]),
    );
    expect(listResponse.body.pagination).toEqual(
      expect.objectContaining({ page: 1, pageSize: 20, total: expect.any(Number), totalPages: expect.any(Number) }),
    );

    const detailResponse = await request(app.getHttpServer())
      .get(`/ledger-entries/${createdEntryId}`)
      .expect(200);
    expect(detailResponse.body).toEqual(
      expect.objectContaining({ id: createdEntryId }),
    );
  });

  it('rejects an account that is not owned by the configured user', async () => {
    const response = await request(app.getHttpServer())
      .post('/ledger-entries')
      .send({ ...createInput(), accountId: unownedAccountId, categoryId })
      .expect(404);

    expect(response.body.message).toBe('Account not found');
  });

  it('rejects a category that is not owned by the configured user', async () => {
    const response = await request(app.getHttpServer())
      .post('/ledger-entries')
      .send({ ...createInput(), accountId, categoryId: unownedCategoryId })
      .expect(404);

    expect(response.body.message).toBe('Category not found');
  });

  it('creates an entry group, appends entries, and calculates the total from ledger entries', async () => {
    const groupResponse = await request(app.getHttpServer())
      .post('/entry-groups')
      .send({
        name: `Hackathon expenses ${fixtureId}`,
        type: 'expense',
        description: 'Expenses related to the event',
      })
      .expect(201);

    createdGroupId = groupResponse.body.id;
    expect(groupResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: `Hackathon expenses ${fixtureId}`,
        type: 'EXPENSE',
        total: '0.00',
      }),
    );

    const appendResponse = await request(app.getHttpServer())
      .post(`/entry-groups/${createdGroupId}/entries`)
      .send({ ...createInput(), amount: 5, merchant: 'E2E Bus', accountId, categoryId })
      .expect(201);

    groupedEntryId = appendResponse.body.id;
    expect(appendResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        groupId: createdGroupId,
        merchant: 'E2E Bus',
      }),
    );

    const appendAuditLog = await prisma.auditLog.findFirst({
      where: {
        entityType: 'EntryGroup',
        entityId: createdGroupId,
        action: 'APPEND_ENTRY',
      },
    });
    expect(appendAuditLog).toEqual(
      expect.objectContaining({ metadata: { ledgerEntryId: groupedEntryId } }),
    );

    const listResponse = await request(app.getHttpServer())
      .get('/entry-groups')
      .expect(200);
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: createdGroupId, total: '5' }),
      ]),
    );

    const detailResponse = await request(app.getHttpServer())
      .get(`/entry-groups/${createdGroupId}`)
      .expect(200);
    expect(detailResponse.body).toEqual(
      expect.objectContaining({
        id: createdGroupId,
        total: '5',
        ledgerEntries: expect.arrayContaining([
          expect.objectContaining({ id: groupedEntryId, groupId: createdGroupId }),
        ]),
      }),
    );
  });

  it('returns user-scoped lookup options including entry groups', async () => {
    const response = await request(app.getHttpServer())
      .get('/ledger-entries/options')
      .expect(200);

    expect(response.body.accounts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: accountId })]),
    );
    expect(response.body.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: categoryId })]),
    );
    expect(response.body.groups).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdGroupId })]),
    );
    expect(response.body.accounts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: unownedAccountId })]),
    );
    expect(response.body.categories).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: unownedCategoryId })]),
    );
  });

  it('filters ledger entries, searches case-insensitively, and paginates deterministically', async () => {
    const userId = process.env.DEV_USER_ID!;
    const [filterAccount, filterCategory] = await Promise.all([
      prisma.account.create({
        data: { userId, name: `Filter account ${fixtureId}`, type: 'BANK' },
      }),
      prisma.category.create({
        data: { userId, name: `Filter category ${fixtureId}`, kind: 'INCOME' },
      }),
    ]);
    filterAccountId = filterAccount.id;
    filterCategoryId = filterCategory.id;

    async function addFixtureEntry(input: {
      type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT';
      occurredAt: string;
      merchant: string;
      note?: string;
      accountId?: string;
      categoryId?: string;
      groupId?: string;
    }) {
      const entry = await prisma.ledgerEntry.create({
        data: {
          userId,
          accountId: input.accountId ?? accountId,
          categoryId: input.categoryId ?? categoryId,
          groupId: input.groupId,
          type: input.type,
          amount: 1,
          currency: 'USD',
          merchant: input.merchant,
          note: input.note,
          occurredAt: new Date(input.occurredAt),
          monthKey: input.occurredAt.slice(0, 7),
          inputMethod: 'MANUAL',
        },
      });
      filterEntryIds.push(entry.id);
      return entry;
    }

    const incomeEntry = await addFixtureEntry({
      type: 'INCOME',
      occurredAt: '2026-07-14T12:00:00.000Z',
      merchant: `MiXeD Merchant ${fixtureId}`,
      note: `Case-sensitive note ${fixtureId}`,
    });
    const monthEntry = await addFixtureEntry({
      type: 'ADJUSTMENT',
      occurredAt: '2026-06-14T12:00:00.000Z',
      merchant: `June entry ${fixtureId}`,
      accountId: filterAccount.id,
      categoryId: filterCategory.id,
    });
    const groupEntry = await addFixtureEntry({
      type: 'EXPENSE',
      occurredAt: '2026-07-13T12:00:00.000Z',
      merchant: `Grouped entry ${fixtureId}`,
      note: `Lookup NOTE ${fixtureId}`,
      groupId: createdGroupId,
    });
    const oldestPageEntry = await addFixtureEntry({
      type: 'EXPENSE',
      occurredAt: '2026-08-01T12:00:00.000Z',
      merchant: `Pagination ${fixtureId}`,
    });
    const middlePageEntry = await addFixtureEntry({
      type: 'EXPENSE',
      occurredAt: '2026-08-02T12:00:00.000Z',
      merchant: `Pagination ${fixtureId}`,
    });
    const newestPageEntry = await addFixtureEntry({
      type: 'EXPENSE',
      occurredAt: '2026-08-03T12:00:00.000Z',
      merchant: `Pagination ${fixtureId}`,
    });

    const typeResponse = await request(app.getHttpServer()).get('/ledger-entries?type=income').expect(200);
    expect(typeResponse.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: incomeEntry.id })]));

    const monthResponse = await request(app.getHttpServer()).get('/ledger-entries?month=2026-06').expect(200);
    expect(monthResponse.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: monthEntry.id })]));

    const categoryResponse = await request(app.getHttpServer()).get(`/ledger-entries?categoryId=${filterCategory.id}`).expect(200);
    expect(categoryResponse.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: monthEntry.id })]));

    const accountResponse = await request(app.getHttpServer()).get(`/ledger-entries?accountId=${filterAccount.id}`).expect(200);
    expect(accountResponse.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: monthEntry.id })]));

    const groupResponse = await request(app.getHttpServer()).get(`/ledger-entries?groupId=${createdGroupId}`).expect(200);
    expect(groupResponse.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: groupEntry.id })]));

    const merchantSearchResponse = await request(app.getHttpServer()).get(`/ledger-entries?search=mIxEd%20mErChAnT%20${fixtureId}`).expect(200);
    expect(merchantSearchResponse.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: incomeEntry.id })]));

    const noteSearchResponse = await request(app.getHttpServer()).get(`/ledger-entries?search=lookup%20note%20${fixtureId}`).expect(200);
    expect(noteSearchResponse.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: groupEntry.id })]));

    const combinedResponse = await request(app.getHttpServer())
      .get(`/ledger-entries?type=income&month=2026-07&accountId=${accountId}&categoryId=${categoryId}&search=mixed%20merchant%20${fixtureId}`)
      .expect(200);
    expect(combinedResponse.body).toEqual(expect.objectContaining({
      data: [expect.objectContaining({ id: incomeEntry.id })],
      pagination: expect.objectContaining({ total: 1, totalPages: 1 }),
    }));

    const firstPageResponse = await request(app.getHttpServer())
      .get(`/ledger-entries?search=pagination%20${fixtureId}&page=1&pageSize=2`)
      .expect(200);
    expect(firstPageResponse.body.pagination).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(firstPageResponse.body.data.map((entry: { id: string }) => entry.id)).toEqual([
      newestPageEntry.id,
      middlePageEntry.id,
    ]);

    const secondPageResponse = await request(app.getHttpServer())
      .get(`/ledger-entries?search=pagination%20${fixtureId}&page=2&pageSize=2`)
      .expect(200);
    expect(secondPageResponse.body.data.map((entry: { id: string }) => entry.id)).toEqual([oldestPageEntry.id]);

    for (const query of ['type=transfer', 'month=2026-13', 'page=0', 'pageSize=101']) {
      await request(app.getHttpServer()).get(`/ledger-entries?${query}`).expect(400);
    }
  });
  it('calculates monthly analytics directly from user-owned ledger entries', async () => {
    const userId = process.env.DEV_USER_ID!;
    const analyticsMonth = '2199-04';
    const nextMonth = '2199-05';
    const [foodCategory, transportCategory] = await Promise.all([
      prisma.category.create({
        data: { userId, name: `Analytics Food ${fixtureId}`, kind: 'EXPENSE' },
      }),
      prisma.category.create({
        data: { userId, name: `Analytics Transport ${fixtureId}`, kind: 'EXPENSE' },
      }),
    ]);
    analyticsCategoryIds.push(foodCategory.id, transportCategory.id);

    async function addAnalyticsEntry(input: {
      type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT';
      amount: number;
      month: string;
      categoryId?: string;
    }) {
      const entry = await prisma.ledgerEntry.create({
        data: {
          userId,
          accountId,
          categoryId: input.categoryId ?? categoryId,
          type: input.type,
          amount: input.amount,
          currency: 'USD',
          merchant: `Analytics fixture ${fixtureId}`,
          occurredAt: new Date(`${input.month}-15T12:00:00.000Z`),
          monthKey: input.month,
          inputMethod: 'MANUAL',
        },
      });
      analyticsEntryIds.push(entry.id);
    }

    await addAnalyticsEntry({ type: 'INCOME', amount: 1200, month: analyticsMonth });
    await addAnalyticsEntry({ type: 'EXPENSE', amount: 100.32, month: analyticsMonth, categoryId: foodCategory.id });
    await addAnalyticsEntry({ type: 'EXPENSE', amount: 45, month: analyticsMonth, categoryId: foodCategory.id });
    await addAnalyticsEntry({ type: 'EXPENSE', amount: 87, month: analyticsMonth, categoryId: transportCategory.id });
    await addAnalyticsEntry({ type: 'ADJUSTMENT', amount: 999, month: analyticsMonth });
    await addAnalyticsEntry({ type: 'EXPENSE', amount: 50, month: nextMonth });

    await prisma.ledgerEntry.create({
      data: {
        userId: unownedUserId,
        accountId: unownedAccountId,
        categoryId: unownedCategoryId,
        type: 'INCOME',
        amount: 5000,
        currency: 'USD',
        merchant: `Unowned analytics fixture ${fixtureId}`,
        occurredAt: new Date(`${analyticsMonth}-15T12:00:00.000Z`),
        monthKey: analyticsMonth,
        inputMethod: 'MANUAL',
      },
    });

    const summaryResponse = await request(app.getHttpServer())
      .get(`/analytics/monthly-summary?month=${analyticsMonth}`)
      .expect(200);
    expect(summaryResponse.body).toEqual({
      month: analyticsMonth,
      income: 1200,
      expenses: 232.32,
      net: 967.68,
    });

    const breakdownResponse = await request(app.getHttpServer())
      .get(`/analytics/monthly-breakdown?month=${analyticsMonth}`)
      .expect(200);
    expect(breakdownResponse.body).toEqual({
      expenses: [
        { category: `Analytics Food ${fixtureId}`, amount: 145.32 },
        { category: `Analytics Transport ${fixtureId}`, amount: 87 },
      ],
    });

    const historyResponse = await request(app.getHttpServer())
      .get('/analytics/net-history')
      .expect(200);
    expect(historyResponse.body).toEqual(
      expect.arrayContaining([
        { month: analyticsMonth, income: 1200, expenses: 232.32, net: 967.68 },
        { month: nextMonth, income: 0, expenses: 50, net: -50 },
      ]),
    );
    const historyMonths = historyResponse.body.map((item: { month: string }) => item.month);
    expect(historyMonths).toEqual([...historyMonths].sort());

    await request(app.getHttpServer())
      .get('/analytics/monthly-summary?month=2199-13')
      .expect(400);
    await request(app.getHttpServer())
      .get('/analytics/monthly-breakdown')
      .expect(400);

    const emptySummaryResponse = await request(app.getHttpServer())
      .get('/analytics/monthly-summary?month=2199-06')
      .expect(200);
    expect(emptySummaryResponse.body).toEqual({
      month: '2199-06',
      income: 0,
      expenses: 0,
      net: 0,
    });

    const emptyBreakdownResponse = await request(app.getHttpServer())
      .get('/analytics/monthly-breakdown?month=2199-06')
      .expect(200);
    expect(emptyBreakdownResponse.body).toEqual({ expenses: [] });
  });
  afterAll(async () => {
    if (prisma) {
      if (analyticsEntryIds.length) {
        await prisma.ledgerEntry.deleteMany({ where: { id: { in: analyticsEntryIds } } });
      }
      if (filterEntryIds.length) {
        await prisma.ledgerEntry.deleteMany({ where: { id: { in: filterEntryIds } } });
      }
      if (createdEntryId) {
        await prisma.auditLog.deleteMany({
          where: { entityType: 'LedgerEntry', entityId: createdEntryId },
        });
        await prisma.ledgerEntry.delete({ where: { id: createdEntryId } });
      }
      if (groupedEntryId) {
        await prisma.auditLog.deleteMany({
          where: { entityType: 'LedgerEntry', entityId: groupedEntryId },
        });
        await prisma.ledgerEntry.delete({ where: { id: groupedEntryId } });
      }
      if (createdGroupId) {
        await prisma.auditLog.deleteMany({
          where: { entityType: 'EntryGroup', entityId: createdGroupId },
        });
        await prisma.entryGroup.delete({ where: { id: createdGroupId } });
      }
      if (analyticsCategoryIds.length) {
        await prisma.category.deleteMany({ where: { id: { in: analyticsCategoryIds } } });
      }
      if (filterAccountId) await prisma.account.delete({ where: { id: filterAccountId } });
      if (filterCategoryId) await prisma.category.delete({ where: { id: filterCategoryId } });
      if (accountId) await prisma.account.delete({ where: { id: accountId } });
      if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
      if (unownedUserId) await prisma.user.delete({ where: { id: unownedUserId } });
      await prisma.$disconnect();
    }
    await app?.close();
  });
});
