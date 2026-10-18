import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  reviewItemsQuerySchema,
  type ReviewItemsQuery,
} from '@finance/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ReviewInboxService } from './review-inbox.service.js';

@Controller('review-items')
export class ReviewInboxController {
  constructor(private readonly reviewInboxService: ReviewInboxService) {}

  @Get()
  findAll(
    @Query(new ZodValidationPipe(reviewItemsQuerySchema))
    query: ReviewItemsQuery,
  ) {
    return this.reviewInboxService.findAll(query.status);
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
