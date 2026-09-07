import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/flac',
  'video/webm',
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/flac': 'flac',
};

export type UploadedAudio = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

export function assertAudioFile(file?: UploadedAudio | null): UploadedAudio {
  if (!file?.buffer?.length) {
    throw new BadRequestException('An audio file named "audio" is required');
  }
  if (file.size > MAX_AUDIO_BYTES || file.buffer.length > MAX_AUDIO_BYTES) {
    throw new BadRequestException(
      `Audio files must be ${MAX_AUDIO_BYTES} bytes or smaller`,
    );
  }

  const mimeType = normalizeMimeType(file.mimetype, file.originalname);
  if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException(
      'Unsupported audio type. Use webm, m4a, mp3, wav, ogg, or flac.',
    );
  }

  return {
    ...file,
    mimetype: mimeType,
    originalname: audioFilename(file.originalname, mimeType),
  };
}

export function hashAudioBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function discardAudioBuffer(buffer: Buffer): void {
  buffer.fill(0);
}

export function audioFilename(originalName: string, mimeType: string): string {
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'webm';
  const base = originalName
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(0, 40);
  return `${base || 'voice-capture'}.${extension}`;
}

function normalizeMimeType(mimetype: string, originalName: string): string {
  const mime = mimetype.toLowerCase().split(';')[0]?.trim() ?? '';
  if (ALLOWED_AUDIO_MIME_TYPES.has(mime)) return mime;

  const extension = originalName.toLowerCase().split('.').pop();
  switch (extension) {
    case 'webm':
      return 'audio/webm';
    case 'ogg':
      return 'audio/ogg';
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'mp4':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    default:
      return mime;
  }
}
