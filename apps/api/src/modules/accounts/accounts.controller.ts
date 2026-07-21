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
  createAccountSchema,
  type CreateAccount,
  updateAccountSchema,
  type UpdateAccount,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AccountsService } from './accounts.service.js';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAccountSchema))
    input: CreateAccount,
  ) {
    return this.accountsService.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateAccountSchema))
    input: UpdateAccount,
  ) {
    return this.accountsService.update(id, input);
  }
}
