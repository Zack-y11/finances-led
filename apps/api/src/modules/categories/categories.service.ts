import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateCategory, UpdateCategory } from '@finance/contracts';
import { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';

type CategoryPrismaKind = 'INCOME' | 'EXPENSE' | 'BOTH';

@Injectable()
export class CategoriesService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  findAll() {
    return this.prisma.db.category.findMany({
      where: { userId: this.userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(input: CreateCategory) {
    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const category = await tx.category.create({
          data: {
            userId: this.userId,
            name: input.name,
            kind: input.kind.toUpperCase() as CategoryPrismaKind,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Category',
            entityId: category.id,
            action: 'CREATE',
            metadata: { fields: ['kind', 'name'] },
          },
        });

        return category;
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, input: UpdateCategory) {
    const category = await this.prisma.db.category.findFirst({
      where: { id, userId: this.userId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found');

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const updated = await tx.category.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.kind !== undefined
              ? { kind: input.kind.toUpperCase() as CategoryPrismaKind }
              : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Category',
            entityId: id,
            action: 'UPDATE',
            metadata: { fields: Object.keys(input).sort() },
          },
        });

        return updated;
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  private handleWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Category name already exists');
    }
    throw error;
  }
}
