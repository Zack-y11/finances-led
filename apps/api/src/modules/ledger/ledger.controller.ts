import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createLedgerEntrySchema,
  type CreateLedgerEntry,
  ledgerEntriesQuerySchema,
  type LedgerEntriesQuery,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { LedgerService } from './ledger.service.js';

@Controller('ledger-entries')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createLedgerEntrySchema))
    input: CreateLedgerEntry,
  ) {
    return this.ledgerService.create(input);
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(ledgerEntriesQuerySchema))
    query: LedgerEntriesQuery,
  ) {
    return this.ledgerService.findAll(query);
  }

  @Get('options')
  getOptions() {
    return this.ledgerService.getOptions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ledgerService.findOne(id);
  }
}
