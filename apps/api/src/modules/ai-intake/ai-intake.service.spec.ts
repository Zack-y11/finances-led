import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AudioTranscriber,
  ReceiptParser,
  TextCommandParser,
} from '@finance/ai';
import type { ParsedFinanceCommand } from '@finance/contracts';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { RulesService } from '../rules/rules.service.js';
import { MerchantsService } from '../merchants/merchants.service.js';
import { AiIntakeService } from './ai-intake.service.js';
import { AudioTranscriberNotConfiguredError } from './audio-transcriber.provider.js';
import { ReceiptParserNotConfiguredError } from './receipt-parser.provider.js';

const command: ParsedFinanceCommand = {
  intent: 'create_ledger_entry',
  data: {
    type: 'expense',
    amount: 3.19,
    currency: 'USD',
    merchant: 'Starbucks',
    account: 'BAC',
    category: 'Food',
    occurredAt: '2026-09-04',
  },
  confidence: 0.94,
};

const receiptCommand: ParsedFinanceCommand = {
  intent: 'create_ledger_entry',
  data: {
    type: 'expense',
    amount: 14.5,
    currency: 'USD',
    merchant: 'Blue Bottle Coffee',
    account: 'BAC',
    category: 'Food',
    occurredAt: '2026-09-04',
  },
  confidence: 0.94,
};

describe('AiIntakeService voice intake', () => {
  const textCommandParser: TextCommandParser = {
    parseText: () => Promise.resolve(command),
  };
  const audioTranscriber: AudioTranscriber = {
    transcribeAudio: () => Promise.resolve('gaste 3.19 en Starbucks con BAC'),
  };
  const receiptParser: ReceiptParser = {
    parseReceipt: () => Promise.resolve(receiptCommand),
  };
  const createdLogs: Array<{ action: string; metadata?: unknown }> = [];
  const createdSessions: Array<{ data: unknown }> = [];
  const prisma = {
    db: {
      account: {
        findMany: () => Promise.resolve([{ name: 'BAC', currency: 'USD' }]),
      },
      category: {
        findMany: () => Promise.resolve([{ name: 'Food', kind: 'EXPENSE' }]),
      },
      $transaction: async (
        fn: (tx: {
          inputSession: {
            create: (args: { data: unknown }) => Promise<{ id: string }>;
          };
          auditLog: {
            create: (args: { data: { action: string } }) => Promise<unknown>;
          };
        }) => Promise<unknown>,
      ) =>
        fn({
          inputSession: {
            create: (args) => {
              createdSessions.push(args);
              return Promise.resolve({
                id: '11111111-1111-4111-8111-111111111111',
              });
            },
          },
          auditLog: {
            create: (args) => {
              createdLogs.push(args.data);
              return Promise.resolve(args.data);
            },
          },
        }),
    },
  } as unknown as PrismaService;
  const rulesService = {
    applyRules: (input: {
      merchant?: string;
      amount: number;
      category?: string;
      account?: string;
    }) =>
      Promise.resolve({
        result: { category: input.category, account: input.account },
        applied: [],
      }),
  } as unknown as RulesService;
  const merchantsService = {
    resolveForProposal: (raw?: string) =>
      Promise.resolve({
        original: raw ?? null,
        merchant: raw ?? null,
        merchantId: null,
        defaultCategoryName: null,
        changed: false,
      }),
  } as unknown as MerchantsService;
  const config = {
    getOrThrow: () => '1b58fb29-1f33-43d8-bdf0-b70844c20045',
  } as unknown as ConfigService;

  beforeEach(() => {
    createdLogs.length = 0;
    createdSessions.length = 0;
  });

  function createService(
    overrides?: Partial<{
      textCommandParser: TextCommandParser;
      audioTranscriber: AudioTranscriber;
      receiptParser: ReceiptParser;
      rulesService: RulesService;
      prisma: PrismaService;
    }>,
  ) {
    return new AiIntakeService(
      overrides?.textCommandParser ?? textCommandParser,
      overrides?.audioTranscriber ?? audioTranscriber,
      overrides?.receiptParser ?? receiptParser,
      overrides?.rulesService ?? rulesService,
      merchantsService,
      overrides?.prisma ?? prisma,
      config,
    );
  }

  it('transcribes voice, stores a session trace, and discards the audio buffer', async () => {
    const service = createService();
    const buffer = Buffer.from('temporary-audio');

    const result = await service.parseVoiceCommand(
      {
        buffer,
        mimetype: 'audio/webm',
        originalname: 'clip.webm',
        size: buffer.length,
      },
      '2026-09-04',
    );

    expect(result).toEqual({
      inputSessionId: '11111111-1111-4111-8111-111111111111',
      transcript: 'gaste 3.19 en Starbucks con BAC',
      command,
      mediaDeleted: true,
      reviewRequired: false,
      canCreateEntry: true,
    });
    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);
    expect(createdLogs.map((log) => log.action)).toEqual([
      'CREATE',
      'MEDIA_DELETED',
      'PARSE',
    ]);
  });

  it('flags uncertain transcripts for review without treating them as posted', async () => {
    const service = createService({
      textCommandParser: {
        parseText: () =>
          Promise.resolve({
            ...command,
            confidence: 0.81,
          }),
      },
    });

    const result = await service.parseVoiceCommand({
      buffer: Buffer.from('temporary-audio'),
      mimetype: 'audio/webm',
      originalname: 'clip.webm',
      size: 15,
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.canCreateEntry).toBe(true);
    expect(result.command?.confidence).toBe(0.81);
    expect(createdSessions[0]?.data).toEqual(
      expect.objectContaining({ status: 'NEEDS_REVIEW' }),
    );
  });

  it('returns a failed session when parsing fails after a successful transcript', async () => {
    const service = createService({
      textCommandParser: {
        parseText: () => Promise.reject(new Error('parser down')),
      },
    });

    const result = await service.parseVoiceCommand({
      buffer: Buffer.from('temporary-audio'),
      mimetype: 'audio/webm',
      originalname: 'clip.webm',
      size: 15,
    });

    expect(result.command).toBeNull();
    expect(result.canCreateEntry).toBe(false);
    expect(result.parseError).toBe('AI text command parser failed');
    expect(result.mediaDeleted).toBe(true);
    expect(createdSessions[0]?.data).toEqual(
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('does not store a session when transcription is not configured', async () => {
    const service = createService({
      audioTranscriber: {
        transcribeAudio: () =>
          Promise.reject(new AudioTranscriberNotConfiguredError()),
      },
    });

    await expect(
      service.parseVoiceCommand({
        buffer: Buffer.from('temporary-audio'),
        mimetype: 'audio/webm',
        originalname: 'clip.webm',
        size: 15,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(createdLogs).toEqual([]);
  });

  it('maps provider transcription failures to a bad gateway error', async () => {
    const service = createService({
      audioTranscriber: {
        transcribeAudio: () => Promise.reject(new Error('whisper down')),
      },
    });

    await expect(
      service.parseVoiceCommand({
        buffer: Buffer.from('temporary-audio'),
        mimetype: 'audio/webm',
        originalname: 'clip.webm',
        size: 15,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('parses a receipt, stores an image session trace, and discards the photo', async () => {
    const service = createService();
    const buffer = Buffer.from('temporary-receipt');

    const result = await service.parseReceiptCommand(
      {
        buffer,
        mimetype: 'image/jpeg',
        originalname: 'receipt.jpg',
        size: buffer.length,
      },
      '2026-09-04',
    );

    expect(result).toEqual({
      inputSessionId: '11111111-1111-4111-8111-111111111111',
      transcript: 'Receipt from Blue Bottle Coffee: USD 14.50 on 2026-09-04',
      command: receiptCommand,
      mediaDeleted: true,
      reviewRequired: false,
      canCreateEntry: true,
    });
    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);
    expect(createdLogs.map((log) => log.action)).toEqual([
      'CREATE',
      'MEDIA_DELETED',
      'PARSE',
    ]);
    expect(createdLogs[1]?.metadata).toEqual({
      mediaHash: expect.any(String),
      mediaDeleted: true,
      durableImageStored: false,
    });
  });

  it('flags uncertain receipts for review and still allows a needs-review create', async () => {
    const service = createService({
      receiptParser: {
        parseReceipt: () =>
          Promise.resolve({
            ...receiptCommand,
            confidence: 0.81,
          }),
      },
    });

    const result = await service.parseReceiptCommand({
      buffer: Buffer.from('temporary-receipt'),
      mimetype: 'image/png',
      originalname: 'receipt.png',
      size: 17,
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.canCreateEntry).toBe(true);
    expect(result.command?.confidence).toBe(0.81);
    expect(result.mediaDeleted).toBe(true);
    expect(createdSessions[0]?.data).toEqual(
      expect.objectContaining({ status: 'NEEDS_REVIEW' }),
    );
  });

  it('returns a failed image session when vision parsing fails', async () => {
    const service = createService({
      receiptParser: {
        parseReceipt: () => Promise.reject(new Error('vision down')),
      },
    });

    const result = await service.parseReceiptCommand({
      buffer: Buffer.from('temporary-receipt'),
      mimetype: 'image/jpeg',
      originalname: 'receipt.jpg',
      size: 17,
    });

    expect(result.command).toBeNull();
    expect(result.canCreateEntry).toBe(false);
    expect(result.parseError).toBe('AI receipt parser failed');
    expect(result.mediaDeleted).toBe(true);
    expect(result.transcript).toBe('Receipt capture could not be parsed');
    expect(createdLogs.map((log) => log.action)).toEqual([
      'CREATE',
      'MEDIA_DELETED',
    ]);
    expect(createdSessions[0]?.data).toEqual(
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('does not store a session when the receipt parser is not configured', async () => {
    const service = createService({
      receiptParser: {
        parseReceipt: () =>
          Promise.reject(new ReceiptParserNotConfiguredError()),
      },
    });

    await expect(
      service.parseReceiptCommand({
        buffer: Buffer.from('temporary-receipt'),
        mimetype: 'image/jpeg',
        originalname: 'receipt.jpg',
        size: 17,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(createdLogs).toEqual([]);
  });

  it('does not trust provider-supplied rule or merchant metadata', async () => {
    const service = createService({
      textCommandParser: {
        parseText: () =>
          Promise.resolve({
            ...command,
            appliedRules: [
              {
                ruleId: '22222222-2222-4222-8222-222222222222',
                ruleName: 'Forged rule',
                priority: 1,
                actionField: 'category',
                actionValue: 'Transport',
                explanation: 'Forged explanation',
              },
            ],
            merchantNormalization: {
              original: 'Forged original',
              canonical: 'Forged canonical',
              merchantId: '33333333-3333-4333-8333-333333333333',
            },
          }),
      },
      rulesService: {
        applyRules: () => Promise.reject(new Error('rules unavailable')),
      } as unknown as RulesService,
    });

    const result = await service.parseVoiceCommand({
      buffer: Buffer.from('temporary-audio'),
      mimetype: 'audio/webm',
      originalname: 'clip.webm',
      size: 15,
    });

    expect(result.command).toEqual(command);
    expect(result.command).not.toHaveProperty('appliedRules');
    expect(result.command).not.toHaveProperty('merchantNormalization');
    expect(createdLogs.map((log) => log.action)).toEqual([
      'CREATE',
      'MEDIA_DELETED',
      'PARSE',
    ]);
    expect(createdLogs[2]?.metadata).toEqual({
      confidence: command.confidence,
      intent: command.intent,
      reviewRequired: false,
    });
  });

  it('rejects a semantically invalid AI date and records a failed session', async () => {
    const service = createService({
      textCommandParser: {
        parseText: () =>
          Promise.resolve({
            ...command,
            data: { ...command.data, occurredAt: '2026-02-31' },
          }),
      },
    });
    const buffer = Buffer.from('temporary-audio');

    const result = await service.parseVoiceCommand({
      buffer,
      mimetype: 'audio/webm',
      originalname: 'clip.webm',
      size: buffer.length,
    });

    expect(result.command).toBeNull();
    expect(result.parseError).toBe('AI parser returned an invalid command');
    expect(result.canCreateEntry).toBe(false);
    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);
    expect(createdSessions[0]?.data).toEqual(
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('wipes a receipt image when loading the parser catalog fails', async () => {
    const buffer = Buffer.from('temporary-receipt');
    const failingPrisma = {
      db: {
        account: {
          findMany: () => Promise.reject(new Error('catalog unavailable')),
        },
        category: {
          findMany: () => Promise.resolve([]),
        },
      },
    } as unknown as PrismaService;
    const service = createService({ prisma: failingPrisma });

    await expect(
      service.parseReceiptCommand({
        buffer,
        mimetype: 'image/jpeg',
        originalname: 'receipt.jpg',
        size: buffer.length,
      }),
    ).rejects.toThrow('catalog unavailable');

    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);
    expect(createdSessions).toEqual([]);
    expect(createdLogs).toEqual([]);
  });
});
