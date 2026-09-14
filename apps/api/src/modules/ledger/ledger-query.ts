import type { LedgerEntriesQuery } from '@finance/contracts';
import { Prisma } from '@finance/database';

export function buildLedgerWhere(
  userId: string,
  query: LedgerEntriesQuery,
): Prisma.LedgerEntryWhereInput {
  const {
    type,
    month,
    startDate,
    endDate,
    categoryId,
    accountId,
    groupId,
    merchantId,
    search,
  } = query;

  const dateFilter: Prisma.LedgerEntryWhereInput =
    startDate || endDate
      ? {
          occurredAt: {
            ...(startDate
              ? { gte: new Date(`${startDate}T00:00:00.000Z`) }
              : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
          },
        }
      : month
        ? { monthKey: month }
        : {};

  return {
    userId,
    ...dateFilter,
    ...(type
      ? { type: type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(accountId ? { accountId } : {}),
    ...(groupId ? { groupId } : {}),
    ...(merchantId ? { merchantId } : {}),
    ...(search
      ? {
          OR: [
            {
              merchant: {
                contains: search,
                mode: 'insensitive',
              },
            },
            { note: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
