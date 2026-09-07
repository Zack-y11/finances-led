import { BadRequestException } from '@nestjs/common';

import {
  assertAudioFile,
  discardAudioBuffer,
  hashAudioBuffer,
  MAX_AUDIO_BYTES,
} from './voice-audio.js';

describe('voice audio helpers', () => {
  it('accepts webm recordings and hashes the original bytes', () => {
    const buffer = Buffer.from('fake-webm-bytes');
    const file = assertAudioFile({
      buffer,
      mimetype: 'audio/webm',
      originalname: 'capture.webm',
      size: buffer.length,
    });

    expect(file.originalname).toBe('capture.webm');
    expect(hashAudioBuffer(buffer)).toHaveLength(64);
  });

  it('infers wav mime type from the filename when the browser omits it', () => {
    const buffer = Buffer.from('RIFF');
    const file = assertAudioFile({
      buffer,
      mimetype: 'application/octet-stream',
      originalname: 'note.wav',
      size: buffer.length,
    });

    expect(file.mimetype).toBe('audio/wav');
    expect(file.originalname).toBe('note.wav');
  });

  it('rejects missing audio, oversized clips, and unsupported types', () => {
    expect(() => assertAudioFile(undefined)).toThrow(BadRequestException);
    expect(() =>
      assertAudioFile({
        buffer: Buffer.alloc(MAX_AUDIO_BYTES + 1),
        mimetype: 'audio/webm',
        originalname: 'too-big.webm',
        size: MAX_AUDIO_BYTES + 1,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertAudioFile({
        buffer: Buffer.from('not-audio'),
        mimetype: 'text/plain',
        originalname: 'notes.txt',
        size: 9,
      }),
    ).toThrow(BadRequestException);
  });

  it('overwrites the in-memory audio buffer after processing', () => {
    const buffer = Buffer.from('secret-audio');
    discardAudioBuffer(buffer);
    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);
  });
});
