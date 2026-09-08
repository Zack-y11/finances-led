import { BadRequestException } from '@nestjs/common';

import {
  assertImageFile,
  discardImageBuffer,
  hashImageBuffer,
  MAX_IMAGE_BYTES,
} from './receipt-image.js';

describe('receipt image helpers', () => {
  it('accepts jpeg receipts and hashes the original bytes', () => {
    const buffer = Buffer.from('fake-jpeg-bytes');
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
    const buffer = Buffer.from('png-bytes');
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

  it('overwrites the in-memory image buffer after processing', () => {
    const buffer = Buffer.from('secret-receipt');
    discardImageBuffer(buffer);
    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);
  });
});
