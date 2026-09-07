import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateLedgerEntry } from '@finance/contracts';
import { jest } from '@jest/globals';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { LedgerService } from './ledger.service.js';

describe('LedgerService confidence policy', () => {
  const accountId = '11111111-1111-4111-8111-111111111111';
  const categoryId = '22222222-2222-4222-8222-222222222222';
  const userId = '33333333-3333-4333-8333-333333333333';
  const entry = { id: '44444444-4444-4444-8444-444444444444' };
  const create = jest
    .fn<() => Promise<typeof entry>>()
    .mockResolvedValue(entry);
  const transaction = {
    ledgerEntry: { create },
    auditLog: {
      create: jest
        .fn<() => Promise<Record<string, never>>>()
        .mockResolvedValue({}),
    },
  };
  const db = {
    account: {
      findFirst: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({
        id: accountId,
      }),
    },
    category: {
      findFirst: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({
        id: categoryId,
      }),
    },
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
  };
  const prisma = { db } as unknown as PrismaService;
  const config = {
    getOrThrow: () => userId,
  } as unknown as ConfigService;
  const service = new LedgerService(prisma, config);
  const baseInput: CreateLedgerEntry = {
    type: 'expense',
    amount: 3.19,
    currency: 'USD',
    occurredAt: '2026-09-06T12:00:00.000Z',
    categoryId,
    accountId,
    inputMethod: 'text',
  };

  beforeEach(() => {
    create.mockClear();
    db.$transaction.mockClear();
  });

  it.each([
    {
      inputMethod: 'text' as const,
      confidence: 0.9,
      status: 'needs_review' as const,
      expected: 'POSTED',
    },
    {
      inputMethod: 'voice' as const,
      confidence: 0.89,
      status: 'posted' as const,
      expected: 'NEEDS_REVIEW',
    },
    {
      inputMethod: 'receipt' as const,
      confidence: 0.7,
      status: 'posted' as const,
      expected: 'NEEDS_REVIEW',
    },
  ])(
    'derives $expected for $inputMethod input at confidence $confidence',
    async ({ inputMethod, confidence, status, expected }) => {
      await service.create({
        ...baseInput,
        inputMethod,
        confidence,
        status,
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ confidence, status: expected }),
        }),
      );
    },
  );

  it.each([
    { inputMethod: 'text' as const, confidence: 0.69 },
    { inputMethod: 'voice' as const },
    { inputMethod: 'receipt' as const, confidence: Number.NaN },
  ])(
    'rejects $inputMethod input that cannot meet the confidence floor',
    async ({ inputMethod, confidence }) => {
      await expect(
        service.create({
          ...baseInput,
          inputMethod,
          ...(confidence === undefined ? {} : { confidence }),
          status: 'posted',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(db.$transaction).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('keeps manual status behavior independent of confidence', async () => {
    await service.create({
      ...baseInput,
      inputMethod: 'manual',
      confidence: 0.1,
      status: 'needs_review',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          confidence: 0.1,
          status: 'NEEDS_REVIEW',
        }),
      }),
    );
  });
});
