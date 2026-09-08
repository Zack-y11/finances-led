import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateAutomationRule,
  UpdateAutomationRule,
} from '@finance/contracts';
import {
  applyAutomationRules,
  type AppliedRuleExplanation,
  type AutomationRuleMatchInput,
  type RuleEvaluateTarget,
} from '@finance/rules';

import { PrismaService } from '../../infrastructure/prisma.service.js';

export type EvaluateTarget = RuleEvaluateTarget;

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
    return this.prisma.db.$transaction(async (tx) => {
      const rule = await tx.automationRule.create({
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

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'AutomationRule',
          entityId: rule.id,
          action: 'CREATE',
          reason: `Created automation rule "${rule.name}".`,
          metadata: {
            priority: rule.priority,
            conditionField: rule.conditionField,
            conditionOp: rule.conditionOp,
            actionField: rule.actionField,
          },
        },
      });

      return rule;
    });
  }

  async update(id: string, input: UpdateAutomationRule) {
    await this.findOne(id);
    return this.prisma.db.$transaction(async (tx) => {
      const rule = await tx.automationRule.update({
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
          ...(input.isEnabled !== undefined
            ? { isEnabled: input.isEnabled }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'AutomationRule',
          entityId: id,
          action: 'UPDATE',
          reason: `Updated automation rule "${rule.name}".`,
          metadata: { fields: Object.keys(input).sort() },
        },
      });

      return rule;
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.db.$transaction(async (tx) => {
      await tx.automationRule.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'AutomationRule',
          entityId: id,
          action: 'DELETE',
          reason: `Deleted automation rule "${existing.name}".`,
          metadata: { name: existing.name, priority: existing.priority },
        },
      });
    });
    return { success: true, id };
  }

  async findOne(id: string) {
    const rule = await this.prisma.db.automationRule.findFirst({
      where: { id, userId: this.userId },
    });
    if (!rule) throw new NotFoundException('Automation rule not found');
    return rule;
  }

  async applyRules<T extends EvaluateTarget>(
    target: T,
  ): Promise<{ result: T; applied: AppliedRuleExplanation[] }> {
    const rules = await this.findAll();
    return applyAutomationRules(target, rules as AutomationRuleMatchInput[]);
  }
}
