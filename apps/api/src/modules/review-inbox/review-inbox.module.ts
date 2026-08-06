import { Module } from '@nestjs/common';

import { ReviewInboxController } from './review-inbox.controller.js';
import { ReviewInboxService } from './review-inbox.service.js';

@Module({
  controllers: [ReviewInboxController],
  providers: [ReviewInboxService],
  exports: [ReviewInboxService],
})
export class ReviewInboxModule {}
