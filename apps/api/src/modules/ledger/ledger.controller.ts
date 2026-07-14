import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  createLedgerEntrySchema,
  type CreateLedgerEntry,
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
  findAll() {
    return this.ledgerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ledgerService.findOne(id);
  }
}
