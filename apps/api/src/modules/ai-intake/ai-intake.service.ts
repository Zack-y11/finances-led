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
  type ReceiptIntakeResult,
  type VoiceIntakeResult,
} from '@finance/contracts';
import type {
  AudioTranscriber,
  ReceiptParser,
  TextCommandParser,
} from '@finance/ai';
import { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import {
  AUDIO_TRANSCRIBER,
  AudioTranscriberNotConfiguredError,
} from './audio-transcriber.provider.js';
import {
  RECEIPT_PARSER,
  ReceiptParserNotConfiguredError,
} from './receipt-parser.provider.js';
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
import {
  assertImageFile,
  discardImageBuffer,
  hashImageBuffer,
  type UploadedImage,
} from './receipt-image.js';

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
    @Inject(RECEIPT_PARSER)
    private readonly receiptParser: ReceiptParser,
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
    const session = await this.persistMediaSession({
      modality: 'VOICE',
      transcriptText: transcript,
      parsed,
      mediaHash,
      mediaMimeType,
      mediaByteLength,
      createReason:
        'Voice capture was transcribed without retaining raw audio.',
      deleteReason: 'Raw voice audio was discarded after transcription.',
      parseReason:
        'Voice transcript was parsed into a finance command proposal.',
      deleteMetadata: {
        mediaHash,
        mediaDeleted: true,
        durableAudioStored: false,
      },
    });

    return toMediaIntakeResult(session.id, transcript, parsed);
  }

  async parseReceiptCommand(
    file: UploadedImage | undefined,
    referenceDate?: string,
  ): Promise<ReceiptIntakeResult> {
    const image = assertImageFile(file);
    const mediaHash = hashImageBuffer(image.buffer);
    const mediaByteLength = image.buffer.length;
    const mediaMimeType = image.mimetype;
    const catalog = await this.loadParserCatalog();
    let parsed: {
      command: ParsedFinanceCommand | null;
      parseError?: string;
    };

    try {
      const command = await this.receiptParser.parseReceipt({
        image: image.buffer,
        mimeType: image.mimetype,
        filename: image.originalname,
        referenceDate: referenceDate ?? currentDate(),
        accounts: catalog.accounts,
        categories: catalog.categories,
      });
      parsed = await this.normalizeParsedCommand(command);
    } catch (error) {
      if (error instanceof ReceiptParserNotConfiguredError) {
        throw new ServiceUnavailableException(
          'AI receipt parser is not configured',
        );
      }
      parsed = {
        command: null,
        parseError: 'AI receipt parser failed',
      };
    } finally {
      discardImageBuffer(image.buffer);
    }

    const transcript = receiptTranscript(parsed.command);
    const session = await this.persistMediaSession({
      modality: 'IMAGE',
      transcriptText: transcript,
      parsed,
      mediaHash,
      mediaMimeType,
      mediaByteLength,
      createReason:
        'Receipt capture was parsed without retaining the raw photo.',
      deleteReason: 'Raw receipt image was discarded after vision extraction.',
      parseReason: 'Receipt image was parsed into a finance command proposal.',
      deleteMetadata: {
        mediaHash,
        mediaDeleted: true,
        durableImageStored: false,
      },
    });

    return toMediaIntakeResult(session.id, transcript, parsed);
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
    const catalog = await this.loadParserCatalog();

    try {
      const command = await this.textCommandParser.parseText({
        text,
        referenceDate,
        accounts: catalog.accounts,
        categories: catalog.categories,
      });
      return this.normalizeParsedCommand(command);
    } catch (error) {
      if (error instanceof TextCommandParserNotConfiguredError) {
        throw new ServiceUnavailableException(
          'AI text command parser is not configured',
        );
      }
      return { command: null, parseError: 'AI text command parser failed' };
    }
  }

  private async loadParserCatalog(): Promise<{
    accounts: Array<{ name: string; currency: string }>;
    categories: Array<{ name: string; kind: CategoryKind }>;
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

    return {
      accounts,
      categories: categories.map((category) => ({
        name: category.name,
        kind: toContractCategoryKind(category.kind),
      })),
    };
  }

  private async normalizeParsedCommand(command: ParsedFinanceCommand): Promise<{
    command: ParsedFinanceCommand | null;
    parseError?: string;
  }> {
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

      parsedData.data.category = evaluated.category || parsedData.data.category;
      parsedData.data.account = evaluated.account || parsedData.data.account;
    } catch {
      // Rules engine failure should not block AI intake response
    }

    return { command: parsedData };
  }

  private async persistMediaSession(input: {
    modality: 'VOICE' | 'IMAGE';
    transcriptText: string;
    parsed: {
      command: ParsedFinanceCommand | null;
      parseError?: string;
    };
    mediaHash: string;
    mediaMimeType: string;
    mediaByteLength: number;
    createReason: string;
    deleteReason: string;
    parseReason: string;
    deleteMetadata: Prisma.InputJsonValue;
  }): Promise<{ id: string }> {
    return this.prisma.db.$transaction(async (tx) => {
      const created = await tx.inputSession.create({
        data: {
          userId: this.userId,
          modality: input.modality,
          transcriptText: input.transcriptText,
          parsedPayload: input.parsed.command
            ? (input.parsed.command as Prisma.InputJsonValue)
            : undefined,
          mediaHash: input.mediaHash,
          mediaMimeType: input.mediaMimeType,
          mediaByteLength: input.mediaByteLength,
          mediaDeletedAt: new Date(),
          status: input.parsed.command ? 'PROCESSED' : 'FAILED',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'InputSession',
          entityId: created.id,
          action: 'CREATE',
          reason: input.createReason,
          metadata: {
            modality: input.modality.toLowerCase(),
            mediaHash: input.mediaHash,
            mediaByteLength: input.mediaByteLength,
            mediaMimeType: input.mediaMimeType,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'InputSession',
          entityId: created.id,
          action: 'MEDIA_DELETED',
          reason: input.deleteReason,
          metadata: input.deleteMetadata,
        },
      });

      if (input.parsed.command) {
        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'InputSession',
            entityId: created.id,
            action: 'PARSE',
            reason: input.parseReason,
            metadata: {
              confidence: input.parsed.command.confidence,
              intent: input.parsed.command.intent,
              reviewRequired: reviewRequired(input.parsed.command.confidence),
            },
          },
        });
      }

      return created;
    });
  }
}

function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function receiptTranscript(command: ParsedFinanceCommand | null): string {
  if (!command) {
    return 'Receipt capture could not be parsed';
  }
  const merchant = command.data.merchant ?? 'Unknown merchant';
  return `Receipt from ${merchant}: ${command.data.currency} ${command.data.amount.toFixed(2)} on ${command.data.occurredAt}`;
}

function toMediaIntakeResult(
  inputSessionId: string,
  transcript: string,
  parsed: {
    command: ParsedFinanceCommand | null;
    parseError?: string;
  },
): VoiceIntakeResult {
  const confidence = parsed.command?.confidence ?? 0;
  return {
    inputSessionId,
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
