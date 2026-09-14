import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateBudget, UpdateBudget } from '@finance/contracts';
import { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';

const budgetInclude = {
  category: { select: { id: true, name: true } },
  account: { select: { id: true, name: true } },
} as const;

type BudgetWithScope = Prisma.BudgetGetPayload<{
  include: typeof budgetInclude;
}>;

type AlertLevel = 'APPROACHING' | 'EXCEEDED';

type Evaluation = {
  budgetId: string;
  monthKey: string;
  spent: number;
  limitAmount: number;
  remainingAmount: number;
  utilization: number;
  alertLevel: 'approaching' | 'exceeded' | null;
  alertId: string | null;
  raisedAt: string | null;
};

@Injectable()
export class BudgetsService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async findAll(month?: string) {
    const monthKey = this.resolveMonth(month);
    const budgets = await this.prisma.db.budget.findMany({
      where: { userId: this.userId },
      include: budgetInclude,
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    });

    return Promise.all(
      budgets.map(async (budget) => this.withEvaluation(budget, monthKey)),
    );
  }

  async findAlerts(month?: string) {
    const budgets = await this.findAll(month);
    const alerts = [];
    for (const budget of budgets) {
      const evaluation = budget.evaluation;
      if (
        !evaluation.alertLevel ||
        !evaluation.alertId ||
        !evaluation.raisedAt
      ) {
        continue;
      }
      alerts.push({
        id: evaluation.alertId,
        budgetId: budget.id,
        budgetName: budget.name,
        monthKey: evaluation.monthKey,
        level: evaluation.alertLevel,
        spent: evaluation.spent,
        limitAmount: evaluation.limitAmount,
        raisedAt: evaluation.raisedAt,
        userId: this.userId,
        category: budget.category,
        account: budget.account,
      });
    }
    return alerts;
  }

  async create(input: CreateBudget) {
    await this.assertScope(input.categoryId, input.accountId);

    try {
      const budget = await this.prisma.db.$transaction(async (tx) => {
        const budget = await tx.budget.create({
          data: {
            userId: this.userId,
            name: input.name,
            period: input.period.toUpperCase() as 'MONTHLY',
            amount: input.amount,
            alertThreshold: input.alertThreshold,
            categoryId: input.categoryId ?? null,
            accountId: input.accountId ?? null,
          },
          include: budgetInclude,
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Budget',
            entityId: budget.id,
            action: 'CREATE',
            reason: `Created budget "${budget.name}".`,
            metadata: this.auditMetadata(budget),
          },
        });

        return budget;
      });
      return this.serializeBudget(budget);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, input: UpdateBudget) {
    const existing = await this.findOne(id);
    const categoryId =
      input.categoryId !== undefined ? input.categoryId : existing.categoryId;
    const accountId =
      input.accountId !== undefined ? input.accountId : existing.accountId;
    await this.assertScope(categoryId, accountId);

    try {
      const budget = await this.prisma.db.$transaction(async (tx) => {
        const result = await tx.budget.updateMany({
          where: { id, userId: this.userId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.period !== undefined
              ? { period: input.period.toUpperCase() as 'MONTHLY' }
              : {}),
            ...(input.amount !== undefined ? { amount: input.amount } : {}),
            ...(input.alertThreshold !== undefined
              ? { alertThreshold: input.alertThreshold }
              : {}),
            categoryId,
            accountId,
          },
        });
        if (!result.count) throw new NotFoundException('Budget not found');

        const budget = await tx.budget.findFirst({
          where: { id, userId: this.userId },
          include: budgetInclude,
        });
        if (!budget) throw new NotFoundException('Budget not found');

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Budget',
            entityId: id,
            action: 'UPDATE',
            reason: `Updated budget "${budget.name}".`,
            metadata: { fields: Object.keys(input).sort() },
          },
        });

        return budget;
      });
      return this.serializeBudget(budget);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.db.$transaction(async (tx) => {
      const result = await tx.budget.deleteMany({
        where: { id, userId: this.userId },
      });
      if (!result.count) throw new NotFoundException('Budget not found');
      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'Budget',
          entityId: id,
          action: 'DELETE',
          reason: `Deleted budget "${existing.name}".`,
          metadata: this.auditMetadata(existing),
        },
      });
    });
    return { success: true, id };
  }

  async findOne(id: string): Promise<BudgetWithScope> {
    const budget = await this.prisma.db.budget.findFirst({
      where: { id, userId: this.userId },
      include: budgetInclude,
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  private async withEvaluation(budget: BudgetWithScope, month: string) {
    const spent = await this.scopedPostedExpenseTotal(budget, month);
    const limit = this.decimalToNumber(budget.amount);
    const alertThreshold = this.decimalToNumber(budget.alertThreshold);
    const utilization = limit > 0 ? spent / limit : 0;
    const alertLevel: AlertLevel | null =
      spent >= limit
        ? 'EXCEEDED'
        : spent >= limit * alertThreshold
          ? 'APPROACHING'
          : null;
    const alert = alertLevel
      ? await this.ensureAlert(budget, month, alertLevel, spent, limit)
      : null;

    return {
      ...this.serializeBudget(budget),
      evaluation: {
        budgetId: budget.id,
        monthKey: month,
        spent,
        limitAmount: limit,
        remainingAmount: limit - spent,
        utilization,
        alertLevel:
          alertLevel === null
            ? null
            : (alertLevel.toLowerCase() as 'approaching' | 'exceeded'),
        alertId: alert?.id ?? null,
        raisedAt: alert?.raisedAt.toISOString() ?? null,
      } satisfies Evaluation,
    };
  }

  private async scopedPostedExpenseTotal(
    budget: BudgetWithScope,
    month: string,
  ): Promise<number> {
    const total = await this.prisma.db.ledgerEntry.aggregate({
      where: {
        userId: this.userId,
        monthKey: month,
        type: 'EXPENSE',
        status: 'POSTED',
        ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
        ...(budget.accountId ? { accountId: budget.accountId } : {}),
      },
      _sum: { amount: true },
    });
    return this.decimalToNumber(total._sum.amount);
  }

  private async ensureAlert(
    budget: BudgetWithScope,
    month: string,
    level: AlertLevel,
    spent: number,
    limitAmount: number,
  ) {
    const existing = await this.prisma.db.budgetAlert.findFirst({
      where: {
        userId: this.userId,
        budgetId: budget.id,
        monthKey: month,
        level,
      },
    });
    if (existing) return existing;

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const alert = await tx.budgetAlert.create({
          data: {
            userId: this.userId,
            budgetId: budget.id,
            monthKey: month,
            level,
            spent,
            limitAmount,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'BudgetAlert',
            entityId: alert.id,
            action: 'RAISED',
            reason: `${level === 'EXCEEDED' ? 'Exceeded' : 'Approaching'} budget "${budget.name}".`,
            metadata: {
              budgetId: budget.id,
              month,
              level: level.toLowerCase(),
              spent,
              limitAmount,
            },
          },
        });
        return alert;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.db.budgetAlert.findFirstOrThrow({
          where: {
            userId: this.userId,
            budgetId: budget.id,
            monthKey: month,
            level,
          },
        });
      }
      throw error;
    }
  }

  private async assertScope(
    categoryId: string | null | undefined,
    accountId: string | null | undefined,
  ) {
    if (!categoryId && !accountId) {
      throw new BadRequestException(
        'A budget must scope a category, account, or both',
      );
    }
    const [category, account] = await Promise.all([
      categoryId
        ? this.prisma.db.category.findFirst({
            where: { id: categoryId, userId: this.userId },
            select: { id: true },
          })
        : null,
      accountId
        ? this.prisma.db.account.findFirst({
            where: { id: accountId, userId: this.userId },
            select: { id: true },
          })
        : null,
    ]);
    if (categoryId && !category)
      throw new NotFoundException('Category not found');
    if (accountId && !account) throw new NotFoundException('Account not found');
  }

  private resolveMonth(month?: string): string {
    const value = month ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      throw new BadRequestException('Month must use YYYY-MM format');
    }
    return value;
  }

  private serializeBudget(budget: BudgetWithScope) {
    return {
      id: budget.id,
      userId: budget.userId,
      name: budget.name,
      period: budget.period.toLowerCase(),
      amount: this.decimalToNumber(budget.amount),
      alertThreshold: this.decimalToNumber(budget.alertThreshold),
      category: budget.category,
      account: budget.account,
      categoryId: budget.categoryId,
      accountId: budget.accountId,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }

  private auditMetadata(
    budget: Pick<
      BudgetWithScope,
      | 'name'
      | 'amount'
      | 'alertThreshold'
      | 'categoryId'
      | 'accountId'
      | 'period'
    >,
  ) {
    return {
      name: budget.name,
      amount: this.decimalToNumber(budget.amount),
      alertThreshold: this.decimalToNumber(budget.alertThreshold),
      categoryId: budget.categoryId,
      accountId: budget.accountId,
      period: budget.period.toLowerCase(),
    };
  }

  private decimalToNumber(
    value: { toString(): string } | null | undefined,
  ): number {
    return Number(value?.toString() ?? 0);
  }

  private handleWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Budget name already exists');
    }
    throw error;
  }
}
