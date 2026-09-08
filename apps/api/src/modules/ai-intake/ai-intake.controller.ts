import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  parseReceiptCommandRequestSchema,
  parseTextCommandRequestSchema,
  parseVoiceCommandRequestSchema,
  type ParseTextCommandRequest,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AiIntakeService } from './ai-intake.service.js';
import { MAX_IMAGE_BYTES, type UploadedImage } from './receipt-image.js';
import { MAX_AUDIO_BYTES, type UploadedAudio } from './voice-audio.js';

@Controller('ai-intake')
export class AiIntakeController {
  constructor(private readonly aiIntakeService: AiIntakeService) {}

  @Post('text')
  parseTextCommand(
    @Body(new ZodValidationPipe(parseTextCommandRequestSchema))
    input: ParseTextCommandRequest,
  ) {
    return this.aiIntakeService.parseTextCommand(input);
  }

  @Post('voice')
  @UseInterceptors(
    FileInterceptor('audio', {
      // Omit dest so multer keeps the clip in memory and never writes it to disk.
      limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
    }),
  )
  parseVoiceCommand(
    @UploadedFile() file: UploadedAudio | undefined,
    @Body() body: unknown,
  ) {
    const fields = new ZodValidationPipe(
      parseVoiceCommandRequestSchema,
    ).transform(body ?? {});
    return this.aiIntakeService.parseVoiceCommand(file, fields.referenceDate);
  }

  @Post('receipt')
  @UseInterceptors(
    FileInterceptor('image', {
      // Omit dest so multer keeps the photo in memory and never writes it to disk.
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  parseReceiptCommand(
    @UploadedFile() file: UploadedImage | undefined,
    @Body() body: unknown,
  ) {
    const fields = new ZodValidationPipe(
      parseReceiptCommandRequestSchema,
    ).transform(body ?? {});
    return this.aiIntakeService.parseReceiptCommand(file, fields.referenceDate);
  }

  @Get('sessions')
  listSessions() {
    return this.aiIntakeService.listSessions();
  }
}
