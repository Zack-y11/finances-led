import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { MerchantsService } from './merchants.service.js';

describe('MerchantsService merge', () => {
  type TestMerchant = {
    id: string;
    displayName: string;
    normalizedKey: string;
    createdAt: Date;
    defaultCategory: { id: string; name: string } | null;
    aliases: Array<{ id: string; alias: string; normalizedKey: string }>;
    _count: { ledgerEntries: number };
  };

  const userId = '11111111-1111-4111-8111-111111111111';
  const targetId = '22222222-2222-4222-8222-222222222222';
  const sourceId = '33333333-3333-4333-8333-333333333333';
  const category = {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Utilities',
  };

  const target: TestMerchant = {
    id: targetId,
    displayName: 'Internet',
    normalizedKey: 'internet',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    defaultCategory: null,
    aliases: [],
    _count: { ledgerEntries: 0 },
  };
  const source: TestMerchant = {
    id: sourceId,
    displayName: 'Internet Provider',
    normalizedKey: 'internet provider',
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    defaultCategory: category,
    aliases: [],
    _count: { ledgerEntries: 2 },
  };

  it('returns the merged target and preserves a source default category', async () => {
    let targetCategory: TestMerchant['defaultCategory'] =
      target.defaultCategory;
    const merchantFindFirst = jest
      .fn<(args: { where: { id: string } }) => Promise<TestMerchant | null>>()
      .mockImplementation(({ where }) => {
        if (where.id === sourceId) return Promise.resolve(source);
        if (where.id === targetId) {
          return Promise.resolve({
            ...target,
            defaultCategory: targetCategory,
          });
        }
        return Promise.resolve(null);
      });
    const merchantUpdate = jest
      .fn<
        (args: {
          data: { defaultCategoryId?: string | null };
        }) => Promise<TestMerchant>
      >()
      .mockImplementation(({ data }) => {
        targetCategory = data.defaultCategoryId ? category : null;
        return Promise.resolve({ ...target, defaultCategory: targetCategory });
      });
    const merchantDelete = jest
      .fn<(args: { where: { id: string } }) => Promise<TestMerchant>>()
      .mockResolvedValue(source);
    const auditCreate = jest
      .fn<() => Promise<Record<string, never>>>()
      .mockResolvedValue({});
    const transaction = {
      merchant: {
        update: merchantUpdate,
        delete: merchantDelete,
      },
      merchantAlias: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async () => ({}),
      },
      ledgerEntry: {
        updateMany: async () => ({ count: 2 }),
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      db: {
        merchant: { findFirst: merchantFindFirst },
        $transaction: jest
          .fn<
            (
              callback: (tx: typeof transaction) => Promise<unknown>,
            ) => Promise<unknown>
          >()
          .mockImplementation((callback) => callback(transaction)),
      },
    } as unknown as PrismaService;
    const config = {
      getOrThrow: () => userId,
    } as unknown as ConfigService;
    const service = new MerchantsService(prisma, config);

    await expect(service.merge(targetId, sourceId)).resolves.toEqual(
      expect.objectContaining({
        id: targetId,
        defaultCategory: category,
      }),
    );

    expect(merchantUpdate).toHaveBeenCalledWith({
      where: { id: targetId },
      data: { defaultCategoryId: category.id },
    });
    expect(merchantDelete).toHaveBeenCalledWith({ where: { id: sourceId } });
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityId: targetId,
          action: 'MERGE',
          metadata: expect.objectContaining({
            sourceMerchantId: sourceId,
            adoptedDefaultCategoryId: category.id,
          }),
        }),
      }),
    );
  });
});
