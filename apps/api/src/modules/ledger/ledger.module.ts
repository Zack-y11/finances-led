import { Module } from '@nestjs/common';

import { LedgerController } from './ledger.controller.js';
import { LedgerService } from './ledger.service.js';
import { MerchantsModule } from '../merchants/merchants.module.js';

@Module({
  imports: [MerchantsModule],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
