import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createLedgerEntrySchema,
  type CreateLedgerEntry,
  ledgerEntriesQuerySchema,
  type LedgerEntriesQuery,
  updateLedgerEntrySchema,
  type UpdateLedgerEntry,
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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ledgerService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLedgerEntrySchema))
    input: UpdateLedgerEntry,
  ) {
    return this.ledgerService.update(id, input);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ledgerService.remove(id);
  }
}
