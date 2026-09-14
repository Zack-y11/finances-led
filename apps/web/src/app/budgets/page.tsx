/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, cardVariants } from "@/components/ui/card";
import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/ui/page-heading";
import {
  createBudget,
  currentMonth,
  deleteBudget,
  getAccounts,
  getBudgetAlerts,
  getBudgets,
  getCategories,
  money,
  updateBudget,
  type Account,
  type Budget,
  type BudgetAlert,
  type BudgetEvaluationStatus,
  type Category,
  type CreateBudgetInput,
} from "@/lib/api";
import { cn, nativeSelectClassName } from "@/lib/utils";

const statusDetails: Record<
  BudgetEvaluationStatus,
  { label: string; variant: "success" | "review" | "destructive" }
> = {
  on_track: { label: "On track", variant: "success" },
  approaching: { label: "Approaching", variant: "review" },
  exceeded: { label: "Exceeded", variant: "destructive" },
};

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [formOpen, setFormOpen] = useState(true);
  const [editing, setEditing] = useState<Budget>();
  const [busyId, setBusyId] = useState<string>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    Promise.all([
      getBudgets(month),
      getBudgetAlerts(month),
      getCategories(),
      getAccounts(),
    ])
      .then(([nextBudgets, nextAlerts, nextCategories, nextAccounts]) => {
        if (!active) return;
        setBudgets(nextBudgets);
        setAlerts(nextAlerts);
        setCategories(nextCategories);
        setAccounts(nextAccounts);
      })
      .catch((reason) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load budgets and alerts.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, reload]);

  const monthLabel = useMemo(() => formatMonth(month), [month]);
  const activeAlerts = alerts.filter((alert) => alert.status !== "on_track");
  const approachingCount = activeAlerts.filter(
    (alert) => alert.status === "approaching",
  ).length;
  const exceededCount = activeAlerts.filter(
    (alert) => alert.status === "exceeded",
  ).length;
  const alertsByBudgetId = useMemo(
    () => new Map(alerts.map((alert) => [alert.budgetId, alert])),
    [alerts],
  );

  function reloadData(message: string) {
    setNotice(message);
    setEditing(undefined);
    setFormOpen(false);
    setReload((value) => value + 1);
  }

  async function handleDelete(budget: Budget) {
    if (!window.confirm("Delete the " + budget.name + " budget?")) {
      return;
    }
    setBusyId(budget.id);
    setError(undefined);
    setNotice(undefined);
    try {
      await deleteBudget(budget.id);
      if (editing?.id === budget.id) setEditing(undefined);
      reloadData("Budget deleted.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not delete budget.",
      );
    } finally {
      setBusyId(undefined);
    }
  }

  function startNewBudget() {
    setEditing(undefined);
    setFormOpen((value) => !value);
    setNotice(undefined);
  }

  function editBudget(budget: Budget) {
    setEditing(budget);
    setFormOpen(true);
    setNotice(undefined);
  }

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="Plan your spending"
        title="Budgets"
        description="Set recurring monthly limits for a category, an account, or both, then see when a limit is approaching or exceeded."
        action={
          <Button className="shrink-0" onClick={startNewBudget} type="button">
            {!formOpen ? <Icon className="size-4" name="plus" /> : null}
            {formOpen ? "Close form" : "New budget"}
          </Button>
        }
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-sm font-semibold text-ink">Review month</p>
          <p className="mt-1 text-sm text-muted">
            Budgets and evaluations are scoped to one calendar month.
          </p>
        </div>
        <label className="w-full sm:max-w-[180px]">
          <span className="sr-only">Budget month</span>
          <Input
            aria-label="Budget month"
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
        </label>
      </Card>

      {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

      {formOpen ? (
        <BudgetForm
          accounts={accounts}
          budget={editing}
          categories={categories}
          onCancel={() => {
            setEditing(undefined);
            setFormOpen(false);
          }}
          onSaved={reloadData}
        />
      ) : null}

      <section
        className="grid gap-4 sm:grid-cols-3"
        aria-label="Budget summary"
      >
        <SummaryCard label="Budgets set" value={String(budgets.length)} />
        <SummaryCard
          label="Approaching"
          value={String(approachingCount)}
          tone="review"
        />
        <SummaryCard
          label="Exceeded"
          value={String(exceededCount)}
          tone="danger"
        />
      </section>

      {loading ? (
        <LoadingCard label={"Loading " + monthLabel + " budgets…"} />
      ) : null}

      {activeAlerts.length ? (
        <Card className="overflow-hidden gap-0">
          <div className="border-b border-border p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  Budget alerts
                </h2>
                <p className="mt-1 text-sm text-muted">
                  These limits need attention for {monthLabel}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {exceededCount ? (
                  <Badge variant="destructive">{exceededCount} exceeded</Badge>
                ) : null}
                {approachingCount ? (
                  <Badge variant="review">{approachingCount} approaching</Badge>
                ) : null}
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {activeAlerts.map((alert, index) => {
              const budget = budgets.find((item) => item.id === alert.budgetId);
              return (
                <AlertRow
                  alert={alert}
                  accounts={accounts}
                  budget={budget}
                  categories={categories}
                  key={alert.budgetId || alert.status + "-" + index}
                />
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden gap-0">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {monthLabel} budgets
              </h2>
              <p className="mt-1 text-sm text-muted">
                {budgets.length
                  ? String(budgets.length) +
                    " spending limit" +
                    (budgets.length === 1 ? "" : "s") +
                    " configured."
                  : "No spending limits configured for this month yet."}
              </p>
            </div>
            <Icon className="text-action" name="chart" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {budgets.map((budget) => {
            const evaluation =
              budget.evaluation ?? alertsByBudgetId.get(budget.id);
            return (
              <BudgetRow
                accounts={accounts}
                budget={budget}
                categories={categories}
                evaluation={evaluation}
                key={budget.id}
                onDelete={handleDelete}
                onEdit={editBudget}
                busy={busyId === budget.id}
              />
            );
          })}
          {!budgets.length && !loading ? (
            <div className="p-5 sm:p-6">
              <p className="text-sm text-muted">
                Add a budget above to start tracking {monthLabel} spending.
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function BudgetForm({
  accounts,
  budget,
  categories,
  onCancel,
  onSaved,
}: {
  accounts: Account[];
  budget?: Budget;
  categories: Category[];
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(budget?.name ?? "");
  const [amount, setAmount] = useState(budget ? String(budget.amount) : "");
  const [alertThreshold, setAlertThreshold] = useState(
    budget ? String(Math.round(budget.alertThreshold * 100)) : "80",
  );
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
  const [accountId, setAccountId] = useState(budget?.accountId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setName(budget?.name ?? "");
    setAmount(budget ? String(budget.amount) : "");
    setAlertThreshold(
      budget ? String(Math.round(budget.alertThreshold * 100)) : "80",
    );
    setCategoryId(budget?.categoryId ?? "");
    setAccountId(budget?.accountId ?? "");
    setError(undefined);
  }, [budget]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const parsedThreshold = Number(alertThreshold) / 100;
    const parsedAmount = Number(amount);
    if (!name.trim()) {
      setError("Name this budget so it is easy to recognize.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a budget amount greater than zero.");
      return;
    }
    if (
      !Number.isFinite(parsedThreshold) ||
      parsedThreshold <= 0 ||
      parsedThreshold > 1
    ) {
      setError("Choose an alert threshold between 1% and 100%.");
      return;
    }
    if (!categoryId && !accountId) {
      setError("Choose a category, an account, or both as the budget scope.");
      return;
    }
    const input: CreateBudgetInput = {
      name: name.trim(),
      period: "monthly",
      amount: parsedAmount,
      alertThreshold: parsedThreshold,
      ...(categoryId ? { categoryId } : {}),
      ...(accountId ? { accountId } : {}),
    };
    setSaving(true);
    try {
      if (budget) {
        await updateBudget(budget.id, input);
        onSaved("Budget updated.");
      } else {
        await createBudget(input);
        onSaved("Budget created.");
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save budget.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={cn(cardVariants(), "grid gap-4 p-5 sm:grid-cols-2 sm:p-6")}
      onSubmit={submit}
    >
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-ink">
          {budget ? "Edit budget" : "Create a monthly budget"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose a category, an account, or both. This limit repeats monthly.
        </p>
      </div>
      <label>
        Name
        <Input
          onChange={(event) => setName(event.target.value)}
          placeholder="Groceries"
          required
          value={name}
        />
      </label>
      <label>
        Monthly limit
        <Input
          min="0.01"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="500.00"
          required
          step="0.01"
          type="number"
          value={amount}
        />
      </label>
      <label>
        Alert threshold (%)
        <Input
          max="100"
          min="1"
          onChange={(event) => setAlertThreshold(event.target.value)}
          required
          step="1"
          type="number"
          value={alertThreshold}
        />
      </label>
      <label>
        Category scope
        <select
          className={nativeSelectClassName}
          onChange={(event) => setCategoryId(event.target.value)}
          value={categoryId}
        >
          <option value="">No category scope</option>
          {categories
            .filter((category) => category.kind !== "income")
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Account scope
        <select
          className={nativeSelectClassName}
          onChange={(event) => setAccountId(event.target.value)}
          value={accountId}
        >
          <option value="">No account scope</option>
          {accounts
            .filter((account) => account.isActive || account.id === accountId)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
        </select>
      </label>
      {error ? (
        <p
          className="text-sm font-medium text-danger sm:col-span-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3 sm:col-span-2">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? "Saving…" : budget ? "Save budget" : "Create budget"}
        </Button>
      </div>
    </form>
  );
}

function BudgetRow({
  accounts,
  budget,
  categories,
  evaluation,
  onDelete,
  onEdit,
  busy,
}: {
  accounts: Account[];
  budget: Budget;
  categories: Category[];
  evaluation?: BudgetAlert;
  onDelete: (budget: Budget) => void;
  onEdit: (budget: Budget) => void;
  busy: boolean;
}) {
  const status = evaluation?.status ?? "on_track";
  const percentage = evaluation?.percentage ?? 0;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const spent = evaluation?.spent ?? 0;
  const details = statusDetails[status];
  const progressClass =
    status === "exceeded"
      ? "bg-danger"
      : status === "approaching"
        ? "bg-review"
        : "bg-success";

  return (
    <article className="grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{budget.name}</h3>
            <Badge variant={details.variant}>{details.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {scopeLabel(budget.category, budget.account, categories, accounts)}{" "}
            · monthly
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-ink">
            {money(budget.amount)}
          </p>
          <p className="text-xs text-muted">monthly limit</p>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">Spent</span>
          <span className="font-semibold tabular-nums text-ink">
            {money(spent)} / {money(budget.amount)}
          </span>
        </div>
        <div
          aria-label={Math.round(percentage) + "% of budget used"}
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.min(Math.max(Math.round(percentage), 0), 100)}
        >
          <div
            className={cn("h-full rounded-full transition-all", progressClass)}
            style={{ width: clampedPercentage + "%" }}
          />
        </div>
        <p className="text-xs text-muted">
          {evaluation
            ? status === "exceeded"
              ? money(Math.max(spent - budget.amount, 0)) + " over the limit"
              : Math.round(percentage) +
                "% used · " +
                money(Math.max(evaluation.remaining, 0)) +
                " remaining"
            : "No spending recorded against this budget yet."}
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={busy}
          onClick={() => onEdit(budget)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Edit
        </Button>
        <Button
          className="text-danger"
          disabled={busy}
          onClick={() => onDelete(budget)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </article>
  );
}

function AlertRow({
  accounts,
  alert,
  budget,
  categories,
}: {
  accounts: Account[];
  alert: BudgetAlert;
  budget?: Budget;
  categories: Category[];
}) {
  const details = statusDetails[alert.status];
  const amount = budget?.amount ?? alert.budgetAmount;
  const scope = scopeLabel(
    alert.category ?? budget?.category ?? null,
    alert.account ?? budget?.account ?? null,
    categories,
    accounts,
    alert.categoryId ?? budget?.categoryId,
    alert.accountId ?? budget?.accountId,
  );

  return (
    <Alert
      className="rounded-none border-0 border-b border-border px-5 py-4 last:border-b-0 sm:px-6"
      variant={alert.status === "exceeded" ? "destructive" : "default"}
    >
      <Icon name={alert.status === "exceeded" ? "trend-down" : "trend-up"} />
      <div>
        <AlertTitle className="flex flex-wrap items-center gap-2">
          {alert.budgetName ?? budget?.name ?? "Budget alert"}
          <Badge variant={details.variant}>{details.label}</Badge>
        </AlertTitle>
        <AlertDescription className="mt-1 text-inherit/80">
          {scope} · {money(alert.spent)} spent of {money(amount)} (
          {Math.round(alert.percentage)}% used)
          {alert.status === "exceeded"
            ? " — " +
              money(Math.max(alert.spent - amount, 0)) +
              " over the limit."
            : " — " + money(Math.max(alert.remaining, 0)) + " remaining."}
        </AlertDescription>
      </div>
    </Alert>
  );
}

function SummaryCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "review" | "danger";
  value: string;
}) {
  const iconClass =
    tone === "danger"
      ? "bg-danger-soft text-danger"
      : tone === "review"
        ? "bg-review-soft text-review"
        : "bg-action-soft text-action";
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg sm:size-9",
            iconClass,
          )}
        >
          <Icon className="size-4" name="chart" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-ink tabular-nums">
        {value}
      </p>
    </Card>
  );
}

function formatMonth(month: string) {
  const date = new Date(month + "-01T12:00:00");
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function scopeLabel(
  category: { id: string; name: string } | null,
  account: { id: string; name: string } | null,
  categories: Category[],
  accounts: Account[],
  categoryId?: string | null,
  accountId?: string | null,
) {
  const categoryName =
    category?.name && category.name !== "Unknown"
      ? category.name
      : categories.find((item) => item.id === (categoryId ?? category?.id))
          ?.name;
  const accountName =
    account?.name && account.name !== "Unknown"
      ? account.name
      : accounts.find((item) => item.id === (accountId ?? account?.id))?.name;
  return (
    (categoryName ?? "All categories") + " · " + (accountName ?? "All accounts")
  );
}
