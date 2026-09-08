"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, cardVariants } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/ui/page-heading";
import { RecurringPatternsCard } from "@/components/ui/recurring-patterns-card";
import {
  createAutomationRule,
  deleteAutomationRule,
  getAutomationRules,
  getLedgerOptions,
  getRecurringPatterns,
  updateAutomationRule,
  type AutomationRule,
  type LedgerOptions,
  type RecurringPattern,
} from "@/lib/api";
import { cn, nativeSelectClassName } from "@/lib/utils";

export default function RulesPage() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [recurring, setRecurring] = useState<RecurringPattern[]>([]);
  const [options, setOptions] = useState<LedgerOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // Rule Form State
  const [name, setName] = useState("");
  const [conditionField, setConditionField] = useState<"merchant" | "note" | "amount">("merchant");
  const [conditionOp, setConditionOp] = useState<"contains" | "equals" | "less_than" | "greater_than">("contains");
  const [conditionValue, setConditionValue] = useState("");
  const [actionField, setActionField] = useState<"category" | "account">("category");
  const [actionValue, setActionValue] = useState("");
  const [priority, setPriority] = useState("1");

  async function load() {
    setLoading(true);
    try {
      const [rulesData, optsData, recurringData] = await Promise.all([
        getAutomationRules(),
        getLedgerOptions(),
        getRecurringPatterns().catch(() => [] as RecurringPattern[]),
      ]);
      setRules(rulesData);
      setOptions(optsData);
      setRecurring(recurringData);
      if (optsData.categories.length > 0 && !actionValue) {
        setActionValue(optsData.categories[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const [rulesData, optsData, recurringData] = await Promise.all([
          getAutomationRules(),
          getLedgerOptions(),
          getRecurringPatterns().catch(() => [] as RecurringPattern[]),
        ]);
        setRules(rulesData);
        setOptions(optsData);
        setRecurring(recurringData);
        if (optsData.categories.length > 0) {
          setActionValue((prev) => (prev ? prev : optsData.categories[0].name));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rules");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !conditionValue.trim() || !actionValue.trim() || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      await createAutomationRule({
        name: name.trim(),
        conditionField,
        conditionOp,
        conditionValue: conditionValue.trim(),
        actionField,
        actionValue: actionValue.trim(),
        priority: Number(priority) || 1,
        isEnabled: true,
      });
      setName("");
      setConditionValue("");
      setBuilderOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRule(rule: AutomationRule) {
    try {
      await updateAutomationRule(rule.id, { isEnabled: !rule.isEnabled });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle rule");
    }
  }

  async function handleDeleteRule(id: string) {
    try {
      await deleteAutomationRule(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="Automation"
        title="Automation rules"
        description="Explicit user input always overrides automation. Enabled rules automatically format category and account defaults on incoming AI text commands."
        action={
          <Button
            onClick={() => setBuilderOpen(!builderOpen)}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            {builderOpen ? "Close Rule Builder" : "New Automation Rule"}
          </Button>
        }
      />

      <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <strong className="text-ink">Rule Evaluation Engine</strong>
        <p className="mt-1 leading-6">
          Rules run in priority order (1 is highest). The first matching rule
          wins for each field, so a later category rule cannot overwrite an
          earlier one. When an incoming merchant or note matches a condition
          (e.g. <em>merchant contains Starbucks</em>), the system applies your
          chosen category or account and writes a <code>RULE_APPLIED</code>{" "}
          audit explanation.
        </p>
      </section>

      {error ? (
        <p className="p-4 rounded-xl border border-danger/30 bg-danger-soft/20 text-sm text-danger font-medium">
          {error}
        </p>
      ) : null}

      {builderOpen ? (
        <form
          className={cn(
            cardVariants(),
            "grid gap-4 p-5 sm:grid-cols-2 sm:p-6",
          )}
          onSubmit={handleCreate}
        >
          <div className="sm:col-span-2">
            <h2 className="text-lg font-semibold text-ink">
              Create Automation Rule
            </h2>
            <p className="mt-1 text-sm text-muted">
              Define matching criteria and automated actions for AI intake processing.
            </p>
          </div>

          <label className="sm:col-span-2 text-xs font-medium text-muted">
            Rule Name
            <Input
              className="mt-1"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Starbucks Dining Rule"
              required
              value={name}
            />
          </label>

          <label className="text-xs font-medium text-muted">
            When Field
            <select
              className={cn(nativeSelectClassName, "mt-1")}
              onChange={(e) => setConditionField(e.target.value as "merchant" | "note" | "amount")}
              value={conditionField}
            >
              <option value="merchant">Merchant</option>
              <option value="note">Note / Text</option>
              <option value="amount">Amount</option>
            </select>
          </label>

          <label className="text-xs font-medium text-muted">
            Condition Operator
            <select
              className={cn(nativeSelectClassName, "mt-1")}
              onChange={(e) => setConditionOp(e.target.value as "contains" | "equals" | "less_than" | "greater_than")}
              value={conditionOp}
            >
              <option value="contains">Contains</option>
              <option value="equals">Equals</option>
              <option value="less_than">Less than (&lt;)</option>
              <option value="greater_than">Greater than (&gt;)</option>
            </select>
          </label>

          <label className="text-xs font-medium text-muted">
            Condition Value
            <Input
              className="mt-1"
              onChange={(e) => setConditionValue(e.target.value)}
              placeholder="e.g. Starbucks or 50.00"
              required
              value={conditionValue}
            />
          </label>

          <label className="text-xs font-medium text-muted">
            Priority Order
            <Input
              className="mt-1"
              min="1"
              onChange={(e) => setPriority(e.target.value)}
              required
              type="number"
              value={priority}
            />
          </label>

          <label className="text-xs font-medium text-muted">
            Then Set Field
            <select
              className={cn(nativeSelectClassName, "mt-1")}
              onChange={(e) => {
                const val = e.target.value as "category" | "account";
                setActionField(val);
                if (val === "category" && options?.categories[0]) {
                  setActionValue(options.categories[0].name);
                } else if (val === "account" && options?.accounts[0]) {
                  setActionValue(options.accounts[0].name);
                }
              }}
              value={actionField}
            >
              <option value="category">Set Category to</option>
              <option value="account">Set Account to</option>
            </select>
          </label>

          <label className="text-xs font-medium text-muted">
            Target Value
            <select
              className={cn(nativeSelectClassName, "mt-1")}
              onChange={(e) => setActionValue(e.target.value)}
              value={actionValue}
            >
              {actionField === "category"
                ? options?.categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))
                : options?.accounts.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
            </select>
          </label>

          <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={() => setBuilderOpen(false)}
              size="sm"
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button disabled={saving} size="sm" type="submit">
              {saving ? "Saving Rule..." : "Save Automation Rule ✓"}
            </Button>
          </div>
        </form>
      ) : null}

      <RecurringPatternsCard patterns={recurring} />

      <Card className="overflow-hidden gap-0">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink">Configured Rules</h2>
            <p className="mt-1 text-sm text-muted">
              {rules.length} active automation rule{rules.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="p-5 text-sm text-muted">Loading rules...</p>
        ) : rules.length === 0 ? (
          <p className="p-5 text-sm text-muted">No automation rules created yet. Click &quot;New Automation Rule&quot; to create one.</p>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <article
                className={`p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                  !rule.isEnabled ? "opacity-60 bg-surface-muted/30" : ""
                }`}
                key={rule.id}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[11px]">
                      Priority #{rule.priority}
                    </Badge>
                    <h3 className="font-semibold text-ink">{rule.name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    When <strong>{rule.conditionField}</strong> {rule.conditionOp.replace("_", " ")} &quot;{rule.conditionValue}&quot; → set <strong>{rule.actionField}</strong> to &quot;{rule.actionValue}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    className={rule.isEnabled ? "text-success" : "text-muted"}
                    onClick={() => handleToggleRule(rule)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {rule.isEnabled ? "Enabled ✓" : "Disabled"}
                  </Button>
                  <Button
                    className="text-danger"
                    onClick={() => handleDeleteRule(rule.id)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
