import type { LedgerExportQuery } from '@finance/contracts';
import { Prisma } from '@finance/database';

export function buildLedgerWhere(
  userId: string,
  query: LedgerExportQuery,
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
    status,
    currency,
    ungrouped,
    financialOnly,
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
    ...(status
      ? {
          status: status.toUpperCase() as 'POSTED' | 'NEEDS_REVIEW' | 'IGNORED',
        }
      : {}),
    ...(currency ? { currency } : {}),
    ...(type
      ? { type: type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' }
      : financialOnly
        ? { type: { in: ['INCOME', 'EXPENSE'] as const } }
        : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(accountId ? { accountId } : {}),
    ...(ungrouped === 'true' ? { groupId: null } : groupId ? { groupId } : {}),
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
