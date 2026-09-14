import { Module } from '@nestjs/common';

import { RecurringPatternsController } from './recurring-patterns.controller.js';
import { RecurringPatternsService } from './recurring-patterns.service.js';
import { RulesController } from './rules.controller.js';
import { RulesService } from './rules.service.js';

@Module({
  controllers: [RulesController, RecurringPatternsController],
  providers: [RulesService, RecurringPatternsService],
  exports: [RulesService, RecurringPatternsService],
})
export class RulesModule {}
