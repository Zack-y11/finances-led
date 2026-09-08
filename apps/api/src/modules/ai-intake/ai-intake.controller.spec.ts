import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { AiIntakeService } from './ai-intake.service.js';
import { AiIntakeController } from './ai-intake.controller.js';

describe('AiIntakeController receipt intake', () => {
  it('clears an in-memory image when request-field validation fails', () => {
    const parseReceiptCommand = jest.fn();
    const service = {
      parseReceiptCommand,
    } as unknown as AiIntakeService;
    const controller = new AiIntakeController(service);
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

    expect(() =>
      controller.parseReceiptCommand(
        {
          buffer,
          mimetype: 'image/jpeg',
          originalname: 'receipt.jpg',
          size: buffer.length,
        },
        { referenceDate: 'not-a-date' },
      ),
    ).toThrow(BadRequestException);

    expect(buffer.equals(Buffer.alloc(buffer.length))).toBe(true);
    expect(parseReceiptCommand).not.toHaveBeenCalled();
  });
});
