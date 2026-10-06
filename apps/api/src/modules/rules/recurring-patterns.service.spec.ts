import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { PrismaService } from '../../infrastructure/prisma.service.js';
import { RecurringPatternsService } from './recurring-patterns.service.js';

describe('RecurringPatternsService', () => {
  it('scopes analytics recurrence inputs by currency without changing the default collection', async () => {
    const findMany = jest
      .fn<(input: unknown) => Promise<never[]>>()
      .mockResolvedValue([]);
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
  });
});
