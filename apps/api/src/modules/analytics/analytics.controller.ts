import { Controller, Get, Query } from '@nestjs/common';
import {
  analyticsMonthQuerySchema,
  type AnalyticsMonthQuery,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('monthly-summary')
  monthlySummary(
    @Query(new ZodValidationPipe(analyticsMonthQuerySchema))
    query: AnalyticsMonthQuery,
  ) {
    return this.analyticsService.monthlySummary(query.month);
  }

  @Get('monthly-breakdown')
  monthlyBreakdown(
    @Query(new ZodValidationPipe(analyticsMonthQuerySchema))
    query: AnalyticsMonthQuery,
  ) {
    return this.analyticsService.monthlyBreakdown(query.month);
  }

  @Get('net-history')
  netHistory() {
    return this.analyticsService.netHistory();
  }
}