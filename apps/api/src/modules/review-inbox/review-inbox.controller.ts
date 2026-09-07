import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  confirmInputSessionSchema,
  type ConfirmInputSession,
} from '@finance/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ReviewInboxService } from './review-inbox.service.js';

@Controller('review-items')
export class ReviewInboxController {
  constructor(private readonly reviewInboxService: ReviewInboxService) {}

  @Get()
  findAll() {
    return this.reviewInboxService.findAll();
  }

  @Post(':id/confirm')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(confirmInputSessionSchema))
    input: ConfirmInputSession,
  ) {
    return this.reviewInboxService.confirm(id, input);
  }

  @Post(':id/dismiss')
  dismiss(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewInboxService.dismiss(id);
  }
}
