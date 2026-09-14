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
  budgetMonthQuerySchema,
  createBudgetSchema,
  type BudgetMonthQuery,
  type CreateBudget,
  type UpdateBudget,
  updateBudgetSchema,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { BudgetsService } from './budgets.service.js';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll(
    @Query(new ZodValidationPipe(budgetMonthQuerySchema))
    query: BudgetMonthQuery,
  ) {
    return this.budgetsService.findAll(query.month);
  }

  @Get('alerts')
  findAlerts(
    @Query(new ZodValidationPipe(budgetMonthQuerySchema))
    query: BudgetMonthQuery,
  ) {
    return this.budgetsService.findAlerts(query.month);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createBudgetSchema)) input: CreateBudget) {
    return this.budgetsService.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateBudgetSchema)) input: UpdateBudget,
  ) {
    return this.budgetsService.update(id, input);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.remove(id);
  }
}
