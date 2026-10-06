import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
  ledgerExportQuerySchema,
  type LedgerExportQuery,
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

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="ledger-entries.csv"')
  @Header('Cache-Control', 'no-store')
  exportCsv(
    @Query(new ZodValidationPipe(ledgerExportQuerySchema))
    query: LedgerExportQuery,
  ) {
    return this.ledgerService.exportCsv(query);
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
