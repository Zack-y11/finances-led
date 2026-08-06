import { Body, Controller, Post } from '@nestjs/common';
import {
  parseTextCommandRequestSchema,
  type ParseTextCommandRequest,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AiIntakeService } from './ai-intake.service.js';

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
}
