import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createAutomationRuleSchema,
  type CreateAutomationRule,
  updateAutomationRuleSchema,
  type UpdateAutomationRule,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { RulesService } from './rules.service.js';

@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  findAll() {
    return this.rulesService.findAll();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAutomationRuleSchema))
    input: CreateAutomationRule,
  ) {
    return this.rulesService.create(input);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rulesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateAutomationRuleSchema))
    input: UpdateAutomationRule,
  ) {
    return this.rulesService.update(id, input);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rulesService.remove(id);
  }
}
