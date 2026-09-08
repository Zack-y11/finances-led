import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createMerchantAliasSchema,
  createMerchantSchema,
  mergeMerchantsSchema,
  type CreateMerchant,
  type CreateMerchantAlias,
  type MergeMerchants,
  type UpdateMerchant,
  updateMerchantSchema,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { MerchantsService } from './merchants.service.js';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get()
  findAll() {
    return this.merchantsService.findAll();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createMerchantSchema))
    input: CreateMerchant,
  ) {
    return this.merchantsService.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMerchantSchema))
    input: UpdateMerchant,
  ) {
    return this.merchantsService.update(id, input);
  }

  @Post(':id/aliases')
  addAlias(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createMerchantAliasSchema))
    input: CreateMerchantAlias,
  ) {
    return this.merchantsService.addAlias(id, input);
  }

  @Post(':id/merge')
  merge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(mergeMerchantsSchema))
    input: MergeMerchants,
  ) {
    return this.merchantsService.merge(id, input.sourceMerchantId);
  }
}
