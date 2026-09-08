import { Controller, Get } from '@nestjs/common';

import { RecurringPatternsService } from './recurring-patterns.service.js';

@Controller('recurring-patterns')
export class RecurringPatternsController {
  constructor(
    private readonly recurringPatternsService: RecurringPatternsService,
  ) {}

  @Get()
  findAll() {
    return this.recurringPatternsService.findAll();
  }
}
