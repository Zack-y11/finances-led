import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  canCreateFromParsedCommand,
  parsedFinanceCommandSchema,
  reviewRequired,
  type CategoryKind,
  type InputSessionTrace,
  type ParsedFinanceCommand,
  type ParseTextCommandRequest,
  type VoiceIntakeResult,
} from '@finance/contracts';
import type { AudioTranscriber, TextCommandParser } from '@finance/ai';
import { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import {
  AUDIO_TRANSCRIBER,
  AudioTranscriberNotConfiguredError,
} from './audio-transcriber.provider.js';
import {
  TEXT_COMMAND_PARSER,
  TextCommandParserNotConfiguredError,
} from './text-command-parser.provider.js';
import { RulesService } from '../rules/rules.service.js';
import {
  assertAudioFile,
  discardAudioBuffer,
  hashAudioBuffer,
  type UploadedAudio,
} from './voice-audio.js';

type PrismaCategoryKind = 'INCOME' | 'EXPENSE' | 'BOTH';
type PrismaInputSessionStatus =
  'PROCESSED' | 'NEEDS_REVIEW' | 'FAILED' | 'CONFIRMED';
type PrismaInputSessionModality = 'TEXT' | 'VOICE' | 'IMAGE' | 'MANUAL';

@Injectable()
export class AiIntakeService {
  private readonly userId: string;

  constructor(
    @Inject(TEXT_COMMAND_PARSER)
    private readonly textCommandParser: TextCommandParser,
    @Inject(AUDIO_TRANSCRIBER)
    private readonly audioTranscriber: AudioTranscriber,
    private readonly rulesService: RulesService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async parseTextCommand(
    input: ParseTextCommandRequest,
  ): Promise<ParsedFinanceCommand> {
    const parsed = await this.parseTranscript(
      input.text,
      input.referenceDate ?? currentDate(),
    );
    if (!parsed.command) {
      throw new BadGatewayException(
        parsed.parseError ?? 'AI text command parser failed',
      );
    }
    return parsed.command;
  }

  async parseVoiceCommand(
    file: UploadedAudio | undefined,
    referenceDate?: string,
  ): Promise<VoiceIntakeResult> {
    const audio = assertAudioFile(file);
    const mediaHash = hashAudioBuffer(audio.buffer);
    const mediaByteLength = audio.buffer.length;
    const mediaMimeType = audio.mimetype;
    let transcript = '';

    try {
      transcript = (
        await this.audioTranscriber.transcribeAudio({
          audio: audio.buffer,
          mimeType: audio.mimetype,
          filename: audio.originalname,
        })
      ).trim();
    } catch (error) {
      if (error instanceof AudioTranscriberNotConfiguredError) {
        throw new ServiceUnavailableException(
          'AI audio transcriber is not configured',
        );
      }
      throw new BadGatewayException('AI audio transcription failed');
    } finally {
      discardAudioBuffer(audio.buffer);
    }

    if (!transcript) {
      throw new BadGatewayException(
        'AI transcription returned an empty transcript',
      );
    }

    const parsed = await this.parseTranscript(
      transcript,
      referenceDate ?? currentDate(),
    );
    const session = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.inputSession.create({
        data: {
          userId: this.userId,
          modality: 'VOICE',
          transcriptText: transcript,
          parsedPayload: parsed.command
            ? (parsed.command as Prisma.InputJsonValue)
            : undefined,
          mediaHash,
          mediaMimeType,
          mediaByteLength,
          mediaDeletedAt: new Date(),
          status: parsed.command ? 'PROCESSED' : 'FAILED',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'InputSession',
          entityId: created.id,
          action: 'CREATE',
          reason: 'Voice capture was transcribed without retaining raw audio.',
          metadata: {
            modality: 'voice',
            mediaHash,
            mediaByteLength,
            mediaMimeType,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'InputSession',
          entityId: created.id,
          action: 'MEDIA_DELETED',
          reason: 'Raw voice audio was discarded after transcription.',
          metadata: {
            mediaHash,
            mediaDeleted: true,
            durableAudioStored: false,
          },
        },
      });

      if (parsed.command) {
        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'InputSession',
            entityId: created.id,
            action: 'PARSE',
            reason:
              'Voice transcript was parsed into a finance command proposal.',
            metadata: {
              confidence: parsed.command.confidence,
              intent: parsed.command.intent,
              reviewRequired: reviewRequired(parsed.command.confidence),
            },
          },
        });
      }

      return created;
    });

    const confidence = parsed.command?.confidence ?? 0;

    return {
      inputSessionId: session.id,
      transcript,
      command: parsed.command,
      mediaDeleted: true,
      reviewRequired: parsed.command ? reviewRequired(confidence) : true,
      canCreateEntry: parsed.command
        ? canCreateFromParsedCommand(confidence)
        : false,
      ...(parsed.parseError ? { parseError: parsed.parseError } : {}),
    };
  }

  async listSessions(): Promise<{ data: InputSessionTrace[] }> {
    const sessions = await this.prisma.db.inputSession.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      data: sessions.map(toInputSessionTrace),
    };
  }

  private async parseTranscript(
    text: string,
    referenceDate: string,
  ): Promise<{
    command: ParsedFinanceCommand | null;
    parseError?: string;
  }> {
    const [accounts, categories] = await Promise.all([
      this.prisma.db.account.findMany({
        where: { userId: this.userId, isActive: true },
        select: { name: true, currency: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.db.category.findMany({
        where: { userId: this.userId },
        select: { name: true, kind: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    try {
      const command = await this.textCommandParser.parseText({
        text,
        referenceDate,
        accounts,
        categories: categories.map((category) => ({
          name: category.name,
          kind: toContractCategoryKind(category.kind),
        })),
      });

      const result = parsedFinanceCommandSchema.safeParse(command);
      if (!result.success) {
        return {
          command: null,
          parseError: 'AI parser returned an invalid command',
        };
      }

      const parsedData = result.data;
      try {
        const evaluated = await this.rulesService.applyRules({
          merchant: parsedData.data.merchant,
          amount: parsedData.data.amount,
          category: parsedData.data.category,
          account: parsedData.data.account,
        });

        parsedData.data.category =
          evaluated.category || parsedData.data.category;
        parsedData.data.account = evaluated.account || parsedData.data.account;
      } catch {
        // Rules engine failure should not block AI intake response
      }

      return { command: parsedData };
    } catch (error) {
      if (error instanceof TextCommandParserNotConfiguredError) {
        throw new ServiceUnavailableException(
          'AI text command parser is not configured',
        );
      }
      return { command: null, parseError: 'AI text command parser failed' };
    }
  }
}

function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toContractCategoryKind(kind: PrismaCategoryKind): CategoryKind {
  switch (kind) {
    case 'INCOME':
      return 'income';
    case 'EXPENSE':
      return 'expense';
    case 'BOTH':
      return 'both';
  }
}

function toInputSessionTrace(session: {
  id: string;
  modality: PrismaInputSessionModality;
  transcriptText: string | null;
  parsedPayload: Prisma.JsonValue;
  mediaHash: string | null;
  mediaMimeType: string | null;
  mediaByteLength: number | null;
  mediaDeletedAt: Date | null;
  status: PrismaInputSessionStatus;
  ledgerEntryId: string | null;
  createdAt: Date;
}): InputSessionTrace {
  return {
    id: session.id,
    modality: session.modality.toLowerCase() as InputSessionTrace['modality'],
    transcriptText: session.transcriptText,
    parsedPayload: session.parsedPayload,
    mediaHash: session.mediaHash,
    mediaMimeType: session.mediaMimeType,
    mediaByteLength: session.mediaByteLength,
    mediaDeletedAt: session.mediaDeletedAt?.toISOString() ?? null,
    status: session.status.toLowerCase() as InputSessionTrace['status'],
    ledgerEntryId: session.ledgerEntryId,
    createdAt: session.createdAt.toISOString(),
  };
}
