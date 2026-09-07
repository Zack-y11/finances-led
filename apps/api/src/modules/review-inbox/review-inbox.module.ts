import { Module } from '@nestjs/common';

import { RulesModule } from '../rules/rules.module.js';

import { ReviewInboxController } from './review-inbox.controller.js';
import { ReviewInboxService } from './review-inbox.service.js';

@Module({
  imports: [RulesModule],
  controllers: [ReviewInboxController],
  providers: [ReviewInboxService],
  exports: [ReviewInboxService],
})
export class ReviewInboxModule {}
