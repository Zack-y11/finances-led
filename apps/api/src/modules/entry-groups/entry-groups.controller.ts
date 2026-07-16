import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  appendEntryToGroupSchema,
  createEntryGroupSchema,
  type AppendEntryToGroup,
  type CreateEntryGroup,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EntryGroupsService } from './entry-groups.service.js';

@Controller('entry-groups')
export class EntryGroupsController {
  constructor(private readonly entryGroupsService: EntryGroupsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createEntryGroupSchema))
    input: CreateEntryGroup,
  ) {
    return this.entryGroupsService.create(input);
  }
  
  @Get()
  findAll() {
    return this.entryGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entryGroupsService.findOne(id);
  }

  @Post(':id/entries')
  appendEntry(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(appendEntryToGroupSchema))
    input: AppendEntryToGroup,
  ) {
    return this.entryGroupsService.appendEntry(id, input);
  }
}
