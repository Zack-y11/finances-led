import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateAutomationRule,
  UpdateAutomationRule,
} from '@finance/contracts';

import { PrismaService } from '../../infrastructure/prisma.service.js';

export type EvaluateTarget = {
  merchant?: string;
  note?: string;
  amount: number;
  category?: string;
  account?: string;
};

@Injectable()
export class RulesService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  findAll() {
    return this.prisma.db.automationRule.findMany({
      where: { userId: this.userId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(input: CreateAutomationRule) {
    return this.prisma.db.automationRule.create({
      data: {
        userId: this.userId,
        name: input.name,
        conditionField: input.conditionField,
        conditionOp: input.conditionOp,
        conditionValue: input.conditionValue,
        actionField: input.actionField,
        actionValue: input.actionValue,
        priority: input.priority,
        isEnabled: input.isEnabled,
      },
    });
  }

  async update(id: string, input: UpdateAutomationRule) {
    await this.findOne(id);
    return this.prisma.db.automationRule.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.conditionField !== undefined
          ? { conditionField: input.conditionField }
          : {}),
        ...(input.conditionOp !== undefined
          ? { conditionOp: input.conditionOp }
          : {}),
        ...(input.conditionValue !== undefined
          ? { conditionValue: input.conditionValue }
          : {}),
        ...(input.actionField !== undefined
          ? { actionField: input.actionField }
          : {}),
        ...(input.actionValue !== undefined
          ? { actionValue: input.actionValue }
          : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.db.automationRule.delete({ where: { id } });
    return { success: true, id };
  }

  async findOne(id: string) {
    const rule = await this.prisma.db.automationRule.findFirst({
      where: { id, userId: this.userId },
    });
    if (!rule) throw new NotFoundException('Automation rule not found');
    return rule;
  }

  async applyRules<T extends EvaluateTarget>(target: T): Promise<T> {
    const rules = await this.findAll();
    const activeRules = rules.filter((r) => r.isEnabled);
    const result = { ...target };

    for (const rule of activeRules) {
      let matches = false;
      const targetVal =
        rule.conditionField === 'merchant'
          ? result.merchant
          : rule.conditionField === 'note'
            ? result.note
            : String(result.amount);

      if (targetVal !== undefined && targetVal !== null) {
        const valStr = String(targetVal).toLowerCase();
        const condStr = rule.conditionValue.toLowerCase();

        switch (rule.conditionOp) {
          case 'contains':
            matches = valStr.includes(condStr);
            break;
          case 'equals':
            matches = valStr === condStr;
            break;
          case 'less_than':
            matches = Number(targetVal) < Number(rule.conditionValue);
            break;
          case 'greater_than':
            matches = Number(targetVal) > Number(rule.conditionValue);
            break;
        }
      }

      if (matches) {
        if (rule.actionField === 'category') {
          result.category = rule.actionValue;
        } else if (rule.actionField === 'account') {
          result.account = rule.actionValue;
        }
      }
    }

    return result;
  }
}
