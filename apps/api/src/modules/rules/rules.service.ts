import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AppliedAutomationRule,
  CreateAutomationRule,
  UpdateAutomationRule,
} from '@finance/contracts';
import type { Prisma } from '@finance/database';

import { PrismaService } from '../../infrastructure/prisma.service.js';

export type EvaluateTarget = {
  merchant?: string;
  note?: string;
  amount: number;
  category?: string;
  account?: string;
};

type RuleModel = Prisma.AutomationRuleGetPayload<Record<string, never>>;

@Injectable()
export class RulesService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async findAll() {
    const rules = await this.prisma.db.automationRule.findMany({
      where: { userId: this.userId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    return this.resolveRules(rules);
  }

  async create(input: CreateAutomationRule) {
    const target = await this.findOwnedTarget(
      input.actionField,
      input.actionTargetId,
    );

    const rule = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.automationRule.create({
        data: {
          userId: this.userId,
          name: input.name,
          conditionField: input.conditionField,
          conditionOp: input.conditionOp,
          conditionValue: input.conditionValue,
          actionField: input.actionField,
          actionTargetId: input.actionTargetId,
          priority: input.priority,
          isEnabled: input.isEnabled,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'AutomationRule',
          entityId: created.id,
          action: 'CREATE',
          metadata: {
            actionField: input.actionField,
            actionTargetId: input.actionTargetId,
          },
        },
      });
      return created;
    });

    return this.toRuleDto(rule, target);
  }

  async update(id: string, input: UpdateAutomationRule) {
    const existing = await this.findRuleModel(id);
    const actionField = input.actionField ?? existing.actionField;
    const actionTargetId = input.actionTargetId ?? existing.actionTargetId;
    if (!actionTargetId) {
      throw new BadRequestException('Rule action target is required');
    }
    const target = await this.findOwnedTarget(actionField, actionTargetId);

    const updated = await this.prisma.db.$transaction(async (tx) => {
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
          ...(input.actionTargetId !== undefined
            ? { actionTargetId: input.actionTargetId }
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
          metadata: { changedFields: Object.keys(input) },
        },
      });
      return rule;
    });

    return this.toRuleDto(updated, target);
  }

  async remove(id: string) {
    await this.findRuleModel(id);
    await this.prisma.db.$transaction(async (tx) => {
      await tx.automationRule.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'AutomationRule',
          entityId: id,
          action: 'DELETE',
        },
      });
    });
    return { success: true, id };
  }

  async findOne(id: string) {
    const rule = await this.findRuleModel(id);
    const [resolved] = await this.resolveRules([rule]);
    return resolved;
  }

  async applyRules<T extends EvaluateTarget>(
    target: T,
  ): Promise<{
    target: T;
    appliedRules: AppliedAutomationRule[];
  }> {
    const rules = await this.prisma.db.automationRule.findMany({
      where: { userId: this.userId, isEnabled: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    const resolvedRules = await this.resolveRules(rules);
    const result = { ...target };
    const appliedRules: AppliedAutomationRule[] = [];
    const appliedFields = new Set<string>();

    for (const rule of resolvedRules) {
      if (!rule.actionTarget || appliedFields.has(rule.actionField)) continue;
      if (!matchesRule(rule, result)) continue;

      if (rule.actionField === 'category') {
        result.category = rule.actionTarget.name;
      } else if (rule.actionField === 'account') {
        result.account = rule.actionTarget.name;
      }
      appliedFields.add(rule.actionField);
      appliedRules.push({
        id: rule.id,
        name: rule.name,
        actionField: rule.actionField as 'category' | 'account',
        targetId: rule.actionTarget.id,
        targetName: rule.actionTarget.name,
      });
    }

    return { target: result, appliedRules };
  }

  async getAppliedRules(ids: string[]): Promise<AppliedAutomationRule[]> {
    if (!ids.length) return [];
    const rules = await this.prisma.db.automationRule.findMany({
      where: { userId: this.userId, id: { in: ids } },
    });
    const resolved = await this.resolveRules(rules);
    const byId = new Map(resolved.map((rule) => [rule.id, rule]));
    return ids.flatMap((id) => {
      const rule = byId.get(id);
      if (!rule?.actionTarget) return [];
      return [
        {
          id: rule.id,
          name: rule.name,
          actionField: rule.actionField as 'category' | 'account',
          targetId: rule.actionTarget.id,
          targetName: rule.actionTarget.name,
        },
      ];
    });
  }

  private async findRuleModel(id: string) {
    const rule = await this.prisma.db.automationRule.findFirst({
      where: { id, userId: this.userId },
    });
    if (!rule) throw new NotFoundException('Automation rule not found');
    return rule;
  }

  private async findOwnedTarget(actionField: string, targetId: string) {
    if (actionField === 'account') {
      const account = await this.prisma.db.account.findFirst({
        where: { id: targetId, userId: this.userId, isActive: true },
        select: { id: true, name: true },
      });
      if (!account)
        throw new NotFoundException('Rule account target not found');
      return account;
    }
    const category = await this.prisma.db.category.findFirst({
      where: { id: targetId, userId: this.userId },
      select: { id: true, name: true },
    });
    if (!category)
      throw new NotFoundException('Rule category target not found');
    return category;
  }

  private async resolveRules(rules: RuleModel[]) {
    const accountIds = rules
      .filter((rule) => rule.actionField === 'account' && rule.actionTargetId)
      .map((rule) => rule.actionTargetId!);
    const categoryIds = rules
      .filter((rule) => rule.actionField === 'category' && rule.actionTargetId)
      .map((rule) => rule.actionTargetId!);
    const [accounts, categories] = await Promise.all([
      this.prisma.db.account.findMany({
        where: { userId: this.userId, id: { in: accountIds } },
        select: { id: true, name: true },
      }),
      this.prisma.db.category.findMany({
        where: { userId: this.userId, id: { in: categoryIds } },
        select: { id: true, name: true },
      }),
    ]);
    const targets = new Map(
      [...accounts, ...categories].map((target) => [target.id, target]),
    );
    return rules.map((rule) =>
      this.toRuleDto(
        rule,
        rule.actionTargetId ? targets.get(rule.actionTargetId) : undefined,
      ),
    );
  }

  private toRuleDto(
    rule: RuleModel,
    actionTarget?: { id: string; name: string },
  ) {
    return {
      ...rule,
      actionTarget: actionTarget ?? null,
    };
  }
}

function matchesRule(
  rule: {
    conditionField: string;
    conditionOp: string;
    conditionValue: string;
  },
  target: EvaluateTarget,
) {
  const value =
    rule.conditionField === 'merchant'
      ? target.merchant
      : rule.conditionField === 'note'
        ? target.note
        : target.amount;
  if (value === undefined || value === null) return false;

  if (rule.conditionField === 'amount') {
    const actual = Number(value);
    const expected = Number(rule.conditionValue);
    if (!Number.isFinite(expected)) return false;
    if (rule.conditionOp === 'equals') return actual === expected;
    if (rule.conditionOp === 'less_than') return actual < expected;
    if (rule.conditionOp === 'greater_than') return actual > expected;
    return false;
  }

  const actual = String(value).toLocaleLowerCase();
  const expected = rule.conditionValue.toLocaleLowerCase();
  return rule.conditionOp === 'contains'
    ? actual.includes(expected)
    : rule.conditionOp === 'equals'
      ? actual === expected
      : false;
}
