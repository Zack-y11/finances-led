import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { PrismaService } from '../../infrastructure/prisma.service.js';
import { RecurringPatternsService } from './recurring-patterns.service.js';

describe('RecurringPatternsService', () => {
  it('scopes analytics recurrence inputs by currency and separates mixed currencies', async () => {
    const findMany = jest
      .fn<(input: unknown) => Promise<Array<Record<string, unknown>>>>()
      .mockResolvedValue(
        (['USD', 'EUR'] as const).flatMap((currency) =>
          [1, 2, 3].map((month) => ({
            id: `${currency}-${month}`,
            type: 'EXPENSE',
            amount: currency === 'USD' ? '10.00' : '20.00',
            currency,
            merchant: 'Same merchant',
            merchantId: null,
            occurredAt: new Date(`2026-0${month}-01T12:00:00.000Z`),
          })),
        ),
      );
    const service = new RecurringPatternsService(
      { db: { ledgerEntry: { findMany } } } as unknown as PrismaService,
      { getOrThrow: () => 'owner' } as unknown as ConfigService,
    );
    await service.findAll('USD');
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'owner',
          status: 'POSTED',
          currency: 'USD',
        }),
      }),
    );
    await service.findAll();
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          userId: 'owner',
          status: 'POSTED',
          merchant: { not: null },
          type: { in: ['INCOME', 'EXPENSE'] },
        },
      }),
    );
    await service.findAll();
    expect(
      (await service.findAll()).data.map((pattern) => ({
        currency: pattern.currency,
        medianAmount: pattern.medianAmount,
      })),
    ).toEqual([
      { currency: 'USD', medianAmount: 10 },
      { currency: 'EUR', medianAmount: 20 },
    ]);
  });
});
