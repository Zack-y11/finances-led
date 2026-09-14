import { Module } from '@nestjs/common';

import { RulesModule } from '../rules/rules.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [RulesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
