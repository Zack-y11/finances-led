import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { ReviewInboxService } from './review-inbox.service.js';

type EntryStatus = 'POSTED' | 'NEEDS_REVIEW' | 'IGNORED';
type SessionStatus = 'PROCESSED' | 'NEEDS_REVIEW' | 'FAILED' | 'CONFIRMED';

type TestEntry = {
  id: string;
  userId: string;
  status: EntryStatus;
  inputSession: {
    id: string;
    status: SessionStatus;
  } | null;
  account: null;
  category: null;
  group: null;
};

type AuditData = {
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

type TestTransaction = {
  ledgerEntry: {
    findFirst: (args: unknown) => Promise<TestEntry | null>;
    updateMany: (args: {
      where: unknown;
      data: { status: 'POSTED' | 'IGNORED' };
    }) => Promise<{ count: number }>;
  };
  inputSession: {
    update: (args: {
      where: unknown;
      data: { status: 'CONFIRMED' | 'FAILED' };
    }) => Promise<unknown>;
  };
  auditLog: {
    create: (args: { data: AuditData }) => Promise<unknown>;
  };
};

describe('ReviewInboxService', () => {
  const entryId = 'entry-id';
  const sessionId = 'session-id';
  const userId = 'configured-user-id';
  const config = {
    getOrThrow: () => userId,
  } as unknown as ConfigService;

  let persistedEntry: TestEntry;
  let entryUpdates: Array<{ where: unknown; data: unknown }>;
  let sessionUpdates: Array<{ where: unknown; data: unknown }>;
  let auditLogs: AuditData[];
  let service: ReviewInboxService;

  const cloneEntry = (): TestEntry => ({
    ...persistedEntry,
    inputSession: persistedEntry.inputSession
      ? { ...persistedEntry.inputSession }
      : null,
  });

  const transaction: TestTransaction = {
    ledgerEntry: {
      findFirst: (args) => {
        const where = (args as { where?: { id?: string; userId?: string } })
          .where;
        if (
          where?.id !== persistedEntry.id ||
          where.userId !== persistedEntry.userId
        ) {
          return Promise.resolve(null);
        }
        return Promise.resolve(cloneEntry());
      },
      updateMany: (args) => {
        entryUpdates.push(args);
        if (persistedEntry.status !== 'NEEDS_REVIEW') {
          return Promise.resolve({ count: 0 });
        }

        persistedEntry = {
          ...persistedEntry,
          status: args.data.status,
        };
        return Promise.resolve({ count: 1 });
      },
    },
    inputSession: {
      update: (args) => {
        sessionUpdates.push(args);
        if (persistedEntry.inputSession) {
          persistedEntry = {
            ...persistedEntry,
            inputSession: {
              ...persistedEntry.inputSession,
              status: args.data.status,
            },
          };
        }
        return Promise.resolve(persistedEntry.inputSession);
      },
    },
    auditLog: {
      create: ({ data }) => {
        auditLogs.push(data);
        return Promise.resolve(data);
      },
    },
  };

  const prisma = {
    db: {
      $transaction: (callback: (tx: TestTransaction) => Promise<unknown>) =>
        callback(transaction),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    persistedEntry = {
      id: entryId,
      userId,
      status: 'NEEDS_REVIEW',
      inputSession: { id: sessionId, status: 'NEEDS_REVIEW' },
      account: null,
      category: null,
      group: null,
    };
    entryUpdates = [];
    sessionUpdates = [];
    auditLogs = [];
    service = new ReviewInboxService(prisma, config);
  });

  it('approves a review item and confirms its input session', async () => {
    await expect(service.approve(entryId)).resolves.toEqual(
      expect.objectContaining({ status: 'POSTED' }),
    );

    expect(entryUpdates).toEqual([
      {
        where: { id: entryId, userId, status: 'NEEDS_REVIEW' },
        data: { status: 'POSTED' },
      },
    ]);
    expect(sessionUpdates).toEqual([
      { where: { id: sessionId }, data: { status: 'CONFIRMED' } },
    ]);
    expect(auditLogs).toEqual([
      expect.objectContaining({
        userId,
        entityType: 'LedgerEntry',
        entityId: entryId,
        action: 'APPROVE',
        metadata: {
          previousStatus: 'NEEDS_REVIEW',
          newStatus: 'POSTED',
          inputSessionId: sessionId,
        },
      }),
      expect.objectContaining({
        userId,
        entityType: 'InputSession',
        entityId: sessionId,
        action: 'CONFIRM',
        metadata: {
          previousStatus: 'NEEDS_REVIEW',
          newStatus: 'CONFIRMED',
          ledgerEntryId: entryId,
        },
      }),
    ]);
  });

  it('rejects a review item and marks its input session failed', async () => {
    await expect(service.reject(entryId)).resolves.toEqual(
      expect.objectContaining({ status: 'IGNORED' }),
    );

    expect(sessionUpdates).toEqual([
      { where: { id: sessionId }, data: { status: 'FAILED' } },
    ]);
    expect(auditLogs).toEqual([
      expect.objectContaining({
        entityType: 'LedgerEntry',
        entityId: entryId,
        action: 'REJECT',
        metadata: {
          previousStatus: 'NEEDS_REVIEW',
          newStatus: 'IGNORED',
          inputSessionId: sessionId,
        },
      }),
      expect.objectContaining({
        entityType: 'InputSession',
        entityId: sessionId,
        action: 'REJECT',
        metadata: {
          previousStatus: 'NEEDS_REVIEW',
          newStatus: 'FAILED',
          ledgerEntryId: entryId,
        },
      }),
    ]);
  });

  it.each([
    ['approve', 'POSTED'],
    ['reject', 'IGNORED'],
  ] as const)('does not %s an already %s entry', async (action, status) => {
    persistedEntry = { ...persistedEntry, status };

    const transition =
      action === 'approve' ? service.approve(entryId) : service.reject(entryId);

    await expect(transition).rejects.toBeInstanceOf(ConflictException);
    expect(entryUpdates).toEqual([]);
    expect(sessionUpdates).toEqual([]);
    expect(auditLogs).toEqual([]);
  });

  it('returns not found for an entry outside the configured user', async () => {
    persistedEntry = { ...persistedEntry, userId: 'another-user-id' };

    await expect(service.approve(entryId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(entryUpdates).toEqual([]);
    expect(sessionUpdates).toEqual([]);
    expect(auditLogs).toEqual([]);
  });
});
