import { buildLedgerWhere } from './ledger-query.js';

const userId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const accountId = '33333333-3333-4333-8333-333333333333';
const merchantId = '44444444-4444-4444-8444-444444444444';

function query(
  overrides: Partial<Parameters<typeof buildLedgerWhere>[1]> = {},
) {
  return {
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

describe('buildLedgerWhere', () => {
  it('always scopes to the configured user', () => {
    expect(buildLedgerWhere(userId, query())).toEqual({ userId });
  });

  it('uses monthKey when no date range is provided', () => {
    expect(buildLedgerWhere(userId, query({ month: '2026-07' }))).toEqual({
      userId,
      monthKey: '2026-07',
    });
  });

  it('lets an explicit date range take precedence over month', () => {
    expect(
      buildLedgerWhere(
        userId,
        query({
          month: '2026-07',
          startDate: '2026-08-02',
          endDate: '2026-08-03',
        }),
      ),
    ).toEqual({
      userId,
      occurredAt: {
        gte: new Date('2026-08-02T00:00:00.000Z'),
        lte: new Date('2026-08-03T23:59:59.999Z'),
      },
    });
  });

  it('composes category, account, merchant, type, and search filters', () => {
    expect(
      buildLedgerWhere(
        userId,
        query({
          type: 'expense',
          categoryId,
          accountId,
          merchantId,
          search: 'Starbucks',
        }),
      ),
    ).toEqual({
      userId,
      type: 'EXPENSE',
      categoryId,
      accountId,
      merchantId,
      OR: [
        { merchant: { contains: 'Starbucks', mode: 'insensitive' } },
        { note: { contains: 'Starbucks', mode: 'insensitive' } },
      ],
    });
  });
});
