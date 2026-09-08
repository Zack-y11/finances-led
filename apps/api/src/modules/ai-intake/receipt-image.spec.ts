import { BadRequestException } from '@nestjs/common';

import {
  assertImageFile,
  discardImageBuffer,
  hashImageBuffer,
  MAX_IMAGE_BYTES,
} from './receipt-image.js';

describe('receipt image helpers', () => {
  it('accepts jpeg receipts and hashes the original bytes', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const file = assertImageFile({
      buffer,
      mimetype: 'image/jpeg',
      originalname: 'receipt.jpg',
      size: buffer.length,
    });

    expect(file.originalname).toBe('receipt.jpg');
    expect(file.mimetype).toBe('image/jpeg');
    expect(hashImageBuffer(buffer)).toHaveLength(64);
  });

  it('infers png mime type from the filename when the browser omits it', () => {
    const buffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const file = assertImageFile({
      buffer,
      mimetype: 'application/octet-stream',
      originalname: 'capture.png',
      size: buffer.length,
    });

    expect(file.mimetype).toBe('image/png');
    expect(file.originalname).toBe('capture.png');
  });

  it('rejects missing images, oversized files, and unsupported types', () => {
    expect(() => assertImageFile(undefined)).toThrow(BadRequestException);
    expect(() =>
      assertImageFile({
        buffer: Buffer.alloc(MAX_IMAGE_BYTES + 1),
        mimetype: 'image/jpeg',
        originalname: 'too-big.jpg',
        size: MAX_IMAGE_BYTES + 1,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertImageFile({
        buffer: Buffer.from('not-an-image'),
        mimetype: 'text/plain',
        originalname: 'notes.txt',
        size: 12,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects spoofed image metadata and clears rejected upload buffers', () => {
    const buffer = Buffer.from('not-an-image');

    expect(() =>
      assertImageFile({
        buffer,
        mimetype: 'text/plain',
        originalname: 'notes.txt',
        size: buffer.length,
      }),
    ).toThrow(BadRequestException);
    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);

    const mismatchedMetadata = Buffer.from('receipt-bytes');
    expect(() =>
      assertImageFile({
        buffer: mismatchedMetadata,
        mimetype: 'image/jpeg',
        originalname: 'receipt.jpg',
        size: mismatchedMetadata.length + 1,
      }),
    ).toThrow(BadRequestException);
    expect(
      mismatchedMetadata.equals(Buffer.alloc(mismatchedMetadata.length)),
    ).toBe(true);
  });

  it('overwrites the in-memory image buffer after processing', () => {
    const buffer = Buffer.from('secret-receipt');
    discardImageBuffer(buffer);
    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);
  });
});
