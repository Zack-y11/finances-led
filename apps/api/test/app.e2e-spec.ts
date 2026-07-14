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
    expect(listResponse.body.entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdEntryId })]),
    );
    expect(listResponse.body.accounts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: accountId })]),
    );
    expect(listResponse.body.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: categoryId })]),
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

  afterAll(async () => {
    if (prisma) {
      if (createdEntryId) {
        await prisma.auditLog.deleteMany({
          where: { entityType: 'LedgerEntry', entityId: createdEntryId },
        });
        await prisma.ledgerEntry.delete({ where: { id: createdEntryId } });
      }
      if (accountId) await prisma.account.delete({ where: { id: accountId } });
      if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
      if (unownedUserId) await prisma.user.delete({ where: { id: unownedUserId } });
      await prisma.$disconnect();
    }
    await app?.close();
  });
});
