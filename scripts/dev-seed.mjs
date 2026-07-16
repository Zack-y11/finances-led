import dotenv from 'dotenv';
import { createPrismaClient } from '../packages/database/dist/src/index.js';

dotenv.config({ path: ['.env.local', '.env'] });

const devUserId = process.env.DEV_USER_ID ?? '1b58fb29-1f33-43d8-bdf0-b70844c20045';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed development data');
}

const prisma = createPrismaClient(databaseUrl);
const groupId = '66666666-6666-4666-8666-666666666666';

async function upsertAccount({ name, type }) {
  return prisma.account.upsert({
    where: { userId_name: { userId: devUserId, name } },
    update: { type, currency: 'USD', isActive: true },
    create: { userId: devUserId, name, type, currency: 'USD' },
  });
}

async function upsertCategory({ name, kind }) {
  return prisma.category.upsert({
    where: { userId_name: { userId: devUserId, name } },
    update: { kind },
    create: { userId: devUserId, name, kind },
  });
}

async function main() {
  await prisma.$connect();

  await prisma.user.upsert({
    where: { id: devUserId },
    update: { email: 'dev-user@example.test' },
    create: { id: devUserId, email: 'dev-user@example.test' },
  });

  const [cashAccount, bankAccount, groceriesCategory, salaryCategory, transitCategory] =
    await Promise.all([
      upsertAccount({ name: 'Seed Cash', type: 'CASH' }),
      upsertAccount({ name: 'Seed Bank', type: 'BANK' }),
      upsertCategory({ name: 'Groceries', kind: 'EXPENSE' }),
      upsertCategory({ name: 'Salary', kind: 'INCOME' }),
      upsertCategory({ name: 'Transit', kind: 'EXPENSE' }),
    ]);

  await prisma.entryGroup.upsert({
    where: { id: groupId },
    update: {
      userId: devUserId,
      name: 'Seed Errands',
      type: 'EXPENSE',
      description: 'Repeatable development seed group',
    },
    create: {
      id: groupId,
      userId: devUserId,
      name: 'Seed Errands',
      type: 'EXPENSE',
      description: 'Repeatable development seed group',
    },
  });

  const entries = [
    {
      id: '77777777-7777-4777-8777-777777777777',
      accountId: bankAccount.id,
      categoryId: salaryCategory.id,
      type: 'INCOME',
      amount: 3250.0,
      merchant: 'Example Employer',
      note: 'Repeatable development seed income',
      occurredAt: new Date('2026-07-01T14:00:00.000Z'),
      monthKey: '2026-07',
    },
    {
      id: '88888888-8888-4888-8888-888888888888',
      accountId: cashAccount.id,
      categoryId: groceriesCategory.id,
      groupId,
      type: 'EXPENSE',
      amount: 84.35,
      merchant: 'Corner Market',
      note: 'Repeatable development seed expense',
      occurredAt: new Date('2026-07-03T18:30:00.000Z'),
      monthKey: '2026-07',
    },
    {
      id: '99999999-9999-4999-8999-999999999999',
      accountId: cashAccount.id,
      categoryId: transitCategory.id,
      groupId,
      type: 'EXPENSE',
      amount: 12.5,
      merchant: 'City Transit',
      note: 'Repeatable development seed expense',
      occurredAt: new Date('2026-07-03T18:30:00.000Z'),
      monthKey: '2026-07',
    },
  ];

  for (const entry of entries) {
    await prisma.ledgerEntry.upsert({
      where: { id: entry.id },
      update: {
        userId: devUserId,
        accountId: entry.accountId,
        categoryId: entry.categoryId,
        groupId: entry.groupId,
        type: entry.type,
        amount: entry.amount,
        currency: 'USD',
        merchant: entry.merchant,
        note: entry.note,
        occurredAt: entry.occurredAt,
        monthKey: entry.monthKey,
        inputMethod: 'MANUAL',
      },
      create: {
        ...entry,
        userId: devUserId,
        currency: 'USD',
        inputMethod: 'MANUAL',
      },
    });
  }

  console.log(`Seeded development data for DEV_USER_ID=${devUserId}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
