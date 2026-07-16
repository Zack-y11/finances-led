import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns API health instead of the framework placeholder', () => {
      expect(appController.getRoot()).toEqual({
        status: 'ok',
        service: 'finance-ledger-api',
        uptimeSeconds: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });

  describe('health', () => {
    it('returns the same health contract for explicit probes', () => {
      expect(appController.getHealth()).toEqual({
        status: 'ok',
        service: 'finance-ledger-api',
        uptimeSeconds: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });
});
