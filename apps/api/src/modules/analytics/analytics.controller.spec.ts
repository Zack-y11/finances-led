import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { MonthlyClosePrediction } from '@finance/contracts';
import { jest } from '@jest/globals';
import request from 'supertest';

import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsController', () => {
  it('serves the monthly close prediction endpoint with query validation', async () => {
    const prediction = {
      month: '2026-07',
      asOf: '2026-07-10',
      daysInMonth: 31,
      elapsedDays: 10,
      remainingDays: 21,
      actual: { income: 1000, expenses: 100, net: 900 },
      projectedRemaining: { income: 0, expenses: 210, net: -210 },
      forecast: { income: 1000, expenses: 310, net: 690 },
      assumptions: {
        averageDailySpend: 10,
        projectedVariableSpend: 210,
        recurringIncomeStillDue: 0,
        recurringExpensesStillDue: 0,
        recurringStillDue: [],
      },
    } satisfies MonthlyClosePrediction;
    const monthlyClosePrediction = jest.fn(() => Promise.resolve(prediction));
    const moduleFixture = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: { monthlyClosePrediction } },
      ],
    }).compile();
    const app: INestApplication = moduleFixture.createNestApplication();
    await app.init();

    try {
      await request(app.getHttpServer())
        .get(
          '/analytics/monthly-close-prediction?month=2026-07&asOf=2026-07-10',
        )
        .expect(200)
        .expect(prediction);
      await request(app.getHttpServer())
        .get('/analytics/monthly-close-prediction?month=2026-13')
        .expect(400);
    } finally {
      await app.close();
    }

    expect(monthlyClosePrediction).toHaveBeenCalledWith(
      '2026-07',
      '2026-07-10',
    );
  });
});
