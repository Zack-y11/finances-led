import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateAccount, UpdateAccount } from '@finance/contracts';
import { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';

type AccountPrismaType = 'BANK' | 'CASH' | 'WALLET' | 'CREDIT_CARD';

@Injectable()
export class AccountsService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  findAll() {
    return this.prisma.db.account.findMany({
      where: { userId: this.userId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async create(input: CreateAccount) {
    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: {
            userId: this.userId,
            name: input.name,
            type: input.type.toUpperCase() as AccountPrismaType,
            currency: input.currency,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Account',
            entityId: account.id,
            action: 'CREATE',
            metadata: { fields: ['currency', 'name', 'type'] },
          },
        });

        return account;
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, input: UpdateAccount) {
    const account = await this.prisma.db.account.findFirst({
      where: { id, userId: this.userId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException('Account not found');

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const updated = await tx.account.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.type !== undefined
              ? { type: input.type.toUpperCase() as AccountPrismaType }
              : {}),
            ...(input.currency !== undefined
              ? { currency: input.currency }
              : {}),
            ...(input.isActive !== undefined
              ? { isActive: input.isActive }
              : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Account',
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
      throw new ConflictException('Account name already exists');
    }
    throw error;
  }
}
