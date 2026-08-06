import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ReviewInboxService } from './review-inbox.service.js';

@Controller('review-items')
export class ReviewInboxController {
  constructor(private readonly reviewInboxService: ReviewInboxService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.reviewInboxService.findAll(status);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewInboxService.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewInboxService.reject(id);
  }
}
