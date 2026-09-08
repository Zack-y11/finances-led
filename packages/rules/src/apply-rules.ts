import { merchantKeyFromName } from "./merchant-name.js";

export type RuleConditionField = "merchant" | "note" | "amount";
export type RuleConditionOp =
  "contains" | "equals" | "less_than" | "greater_than";
export type RuleActionField = "category" | "account";

export type AutomationRuleMatchInput = {
  id: string;
  name: string;
  conditionField: RuleConditionField;
  conditionOp: RuleConditionOp;
  conditionValue: string;
  actionField: RuleActionField;
  actionValue: string;
  priority: number;
  isEnabled: boolean;
};

export type RuleEvaluateTarget = {
  merchant?: string;
  note?: string;
  amount: number;
  category?: string;
  account?: string;
};

export type AppliedRuleExplanation = {
  ruleId: string;
  ruleName: string;
  priority: number;
  actionField: RuleActionField;
  actionValue: string;
  explanation: string;
};

export function applyAutomationRules<T extends RuleEvaluateTarget>(
  target: T,
  rules: AutomationRuleMatchInput[],
): { result: T; applied: AppliedRuleExplanation[] } {
  const result = { ...target };
  const applied: AppliedRuleExplanation[] = [];
  const claimed = new Set<RuleActionField>();
  const ordered = [...rules]
    .filter((rule) => rule.isEnabled)
    .sort((left, right) => left.priority - right.priority);

  for (const rule of ordered) {
    if (claimed.has(rule.actionField)) continue;
    if (!matchesRule(result, rule)) continue;

    if (rule.actionField === "category") {
      result.category = rule.actionValue;
    } else {
      result.account = rule.actionValue;
    }

    claimed.add(rule.actionField);
    applied.push({
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      actionField: rule.actionField,
      actionValue: rule.actionValue,
      explanation: explainRule(rule),
    });
  }

  return { result, applied };
}

export function explainRule(rule: {
  name: string;
  conditionField: RuleConditionField;
  conditionOp: RuleConditionOp;
  conditionValue: string;
  actionField: RuleActionField;
  actionValue: string;
  priority: number;
}): string {
  const operator = rule.conditionOp.replaceAll("_", " ");
  return `When ${rule.conditionField} ${operator} "${rule.conditionValue}", set ${rule.actionField} to "${rule.actionValue}" (rule "${rule.name}", priority ${rule.priority}).`;
}

function matchesRule(
  target: RuleEvaluateTarget,
  rule: AutomationRuleMatchInput,
): boolean {
  const targetVal =
    rule.conditionField === "merchant"
      ? target.merchant
      : rule.conditionField === "note"
        ? target.note
        : String(target.amount);

  if (targetVal === undefined || targetVal === null || targetVal === "") {
    return false;
  }

  if (rule.conditionField === "amount" && !Number.isFinite(target.amount)) {
    return false;
  }

  const valStr = String(targetVal).trim().toLowerCase();
  const condStr = rule.conditionValue.trim().toLowerCase();

  switch (rule.conditionOp) {
    case "contains":
      return valStr.includes(condStr);
    case "equals":
      if (rule.conditionField === "amount") {
        const expected = Number(rule.conditionValue);
        return (
          Number.isFinite(expected) &&
          Math.round(target.amount * 100) === Math.round(expected * 100)
        );
      }
      if (rule.conditionField === "merchant") {
        const targetKey = merchantKeyFromName(String(targetVal));
        const conditionKey = merchantKeyFromName(rule.conditionValue);
        return targetKey !== null && targetKey === conditionKey;
      }
      return valStr === condStr;
    case "less_than": {
      const left = Number(targetVal);
      const right = Number(rule.conditionValue);
      return Number.isFinite(left) && Number.isFinite(right) && left < right;
    }
    case "greater_than": {
      const left = Number(targetVal);
      const right = Number(rule.conditionValue);
      return Number.isFinite(left) && Number.isFinite(right) && left > right;
    }
    default:
      return false;
  }
}
