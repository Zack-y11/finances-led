import { Module } from '@nestjs/common';

import { LedgerModule } from '../ledger/ledger.module.js';
import { EntryGroupsController } from './entry-groups.controller.js';
import { EntryGroupsService } from './entry-groups.service.js';

@Module({
  imports: [LedgerModule],
  controllers: [EntryGroupsController],
  providers: [EntryGroupsService],
})
export class EntryGroupsModule {}
