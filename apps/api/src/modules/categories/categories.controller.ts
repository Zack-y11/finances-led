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
  createCategorySchema,
  type CreateCategory,
  updateCategorySchema,
  type UpdateCategory,
} from '@finance/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CategoriesService } from './categories.service.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createCategorySchema))
    input: CreateCategory,
  ) {
    return this.categoriesService.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCategorySchema))
    input: UpdateCategory,
  ) {
    return this.categoriesService.update(id, input);
  }
}
