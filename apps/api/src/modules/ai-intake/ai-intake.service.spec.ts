import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AudioTranscriber, TextCommandParser } from '@finance/ai';
import type { ParsedFinanceCommand } from '@finance/contracts';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import { RulesService } from '../rules/rules.service.js';
import { AiIntakeService } from './ai-intake.service.js';
import { AudioTranscriberNotConfiguredError } from './audio-transcriber.provider.js';

describe('AiIntakeService voice intake', () => {
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

  const textCommandParser: TextCommandParser = {
    parseText: () => Promise.resolve(command),
  };
  const audioTranscriber: AudioTranscriber = {
    transcribeAudio: () => Promise.resolve('gaste 3.19 en Starbucks con BAC'),
  };
  const createdLogs: Array<{ action: string; metadata?: unknown }> = [];
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
            create: () =>
              Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }),
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
    }) => Promise.resolve({ category: input.category, account: input.account }),
  } as unknown as RulesService;
  const config = {
    getOrThrow: () => '1b58fb29-1f33-43d8-bdf0-b70844c20045',
  } as unknown as ConfigService;

  beforeEach(() => {
    createdLogs.length = 0;
  });

  it('transcribes voice, stores a session trace, and discards the audio buffer', async () => {
    const service = new AiIntakeService(
      textCommandParser,
      audioTranscriber,
      rulesService,
      prisma,
      config,
    );
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
    const uncertainParser: TextCommandParser = {
      parseText: () =>
        Promise.resolve({
          ...command,
          confidence: 0.81,
        }),
    };
    const service = new AiIntakeService(
      uncertainParser,
      audioTranscriber,
      rulesService,
      prisma,
      config,
    );

    const result = await service.parseVoiceCommand({
      buffer: Buffer.from('temporary-audio'),
      mimetype: 'audio/webm',
      originalname: 'clip.webm',
      size: 15,
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.canCreateEntry).toBe(true);
    expect(result.command?.confidence).toBe(0.81);
  });

  it('returns a failed session when parsing fails after a successful transcript', async () => {
    const failingParser: TextCommandParser = {
      parseText: () => Promise.reject(new Error('parser down')),
    };
    const service = new AiIntakeService(
      failingParser,
      audioTranscriber,
      rulesService,
      prisma,
      config,
    );

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
  });

  it('does not store a session when transcription is not configured', async () => {
    const disabled: AudioTranscriber = {
      transcribeAudio: () =>
        Promise.reject(new AudioTranscriberNotConfiguredError()),
    };
    const service = new AiIntakeService(
      textCommandParser,
      disabled,
      rulesService,
      prisma,
      config,
    );

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
    const failing: AudioTranscriber = {
      transcribeAudio: () => Promise.reject(new Error('whisper down')),
    };
    const service = new AiIntakeService(
      textCommandParser,
      failing,
      rulesService,
      prisma,
      config,
    );

    await expect(
      service.parseVoiceCommand({
        buffer: Buffer.from('temporary-audio'),
        mimetype: 'audio/webm',
        originalname: 'clip.webm',
        size: 15,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
