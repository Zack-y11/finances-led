import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

export function assertImageFile(file?: UploadedImage | null): UploadedImage {
  const buffer = file?.buffer;

  try {
    if (!file || !buffer?.length) {
      throw new BadRequestException('An image file named "image" is required');
    }
    if (!Number.isSafeInteger(file.size) || file.size !== buffer.length) {
      throw new BadRequestException('Invalid image file metadata');
    }
    if (file.size > MAX_IMAGE_BYTES || buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `Receipt images must be ${MAX_IMAGE_BYTES} bytes or smaller`,
      );
    }

    const mimeType = normalizeMimeType(file.mimetype, file.originalname);
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        'Unsupported image type. Use JPEG, PNG, WebP, or GIF.',
      );
    }

    const normalizedMime = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;

    return {
      ...file,
      mimetype: normalizedMime,
      originalname: imageFilename(file.originalname, normalizedMime),
    };
  } catch (error) {
    // Multer uses memory storage for this endpoint. Clear rejected uploads too,
    // including failures that happen before the service reaches its parser.
    if (buffer) discardImageBuffer(buffer);
    throw error;
  }
}

export function hashImageBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function discardImageBuffer(buffer: Buffer): void {
  buffer.fill(0);
}

export function imageFilename(originalName: string, mimeType: string): string {
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'jpg';
  const base = originalName
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(0, 40);
  return `${base || 'receipt-capture'}.${extension}`;
}

function normalizeMimeType(mimetype: string, originalName: string): string {
  const mime = (mimetype ?? '').toLowerCase().split(';')[0]?.trim() ?? '';
  if (ALLOWED_IMAGE_MIME_TYPES.has(mime)) return mime;
  if (mime && mime !== 'application/octet-stream') return mime;

  const extension = (originalName ?? '').toLowerCase().split('.').pop();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return mime;
  }
}
