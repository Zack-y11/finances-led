"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getBudgets,
  getGroupBreakdown,
  money,
  type BudgetEvaluationStatus,
} from "@/lib/api";
import { reportLedgerHref } from "@/lib/report-links";

function useMonthReport<T>(month: string, load: (month: string) => Promise<T>) {
  const [result, setResult] = useState<{
    month: string;
    data?: T;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    load(month).then(
      (data) => {
        if (active) setResult({ month, data });
      },
      (reason) => {
        if (active)
          setResult({
            month,
            error:
              reason instanceof Error
                ? reason.message
                : "Could not load this report.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [month, load]);
  return result?.month === month ? result : undefined;
}

const budgetStatuses: Record<
  BudgetEvaluationStatus,
  { label: string; variant: "success" | "review" | "destructive" }
> = {
  on_track: { label: "On track", variant: "success" },
  approaching: { label: "Approaching", variant: "review" },
  exceeded: { label: "Exceeded", variant: "destructive" },
};

export function BudgetActualReport({ month }: { month: string }) {
  const result = useMonthReport(month, getBudgets);
  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Budget versus actual
          </h2>
          <p className="mt-1 text-sm text-muted">
            Monthly USD limits compared with posted expenses. Each scope is
            evaluated separately.
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-action hover:underline"
          href={`/budgets?month=${month}`}
        >
          Manage budgets
        </Link>
      </div>
      {!result ? (
        <LoadingCard label="Loading budget comparison…" />
      ) : result.error ? (
        <StatusMessage tone="error">{result.error}</StatusMessage>
      ) : result.data?.length ? (
        <Table className="mt-4 [&_tr:hover]:bg-surface-muted">
          <caption className="sr-only">
            Budget versus actual for {month}, USD
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>Budget / scope</TableHead>
              <TableHead className="text-right">Limit</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Remaining / over</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((budget) => {
              const evaluation = budget.evaluation;
              const status = budgetStatuses[evaluation.status];
              return (
                <TableRow key={budget.id}>
                  <TableCell className="min-w-40">
                    <Link
                      className="font-semibold text-action hover:underline"
                      href={reportLedgerHref(month, {
                        type: "expense",
                        categoryId: budget.categoryId,
                        accountId: budget.accountId,
                      })}
                    >
                      {budget.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {[budget.category?.name, budget.account?.name]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(budget.amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(evaluation.spent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(Math.abs(evaluation.remaining))}
                    {evaluation.remaining < 0 ? " over" : " left"}
                  </TableCell>
                  <TableCell>
                    <span className="block text-xs tabular-nums">
                      {Math.round(evaluation.percentage)}%
                    </span>
                    <div
                      role="progressbar"
                      aria-label={`Usage for ${budget.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(evaluation.percentage, 100)}
                      className="h-2 w-24 overflow-hidden rounded-full bg-surface-muted"
                    >
                      <div
                        className={`h-full ${evaluation.status === "exceeded" ? "bg-danger" : evaluation.status === "approaching" ? "bg-review" : "bg-action"}`}
                        style={{
                          width: `${Math.min(evaluation.percentage, 100)}%`,
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="mt-4 text-sm text-muted">
          No budgets yet. Add a monthly limit to compare your spending.
        </p>
      )}
    </Card>
  );
}

export function GroupAnalyticsReport({ month }: { month: string }) {
  const result = useMonthReport(month, getGroupBreakdown);
  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Monthly groups</h2>
      <p className="mt-1 text-sm text-muted">
        Posted USD income and expenses by group, including ungrouped entries.
      </p>
      {!result ? (
        <LoadingCard label="Loading group breakdown…" />
      ) : result.error ? (
        <StatusMessage tone="error">{result.error}</StatusMessage>
      ) : result.data?.groups.length ? (
        <Table className="mt-4 [&_tr:hover]:bg-surface-muted">
          <caption className="sr-only">
            Monthly group breakdown for {month}, USD
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Entries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.groups.map((group) => (
              <TableRow key={group.groupId ?? "ungrouped"}>
                <TableCell className="min-w-40">
                  <Link
                    className="font-semibold text-action hover:underline"
                    href={reportLedgerHref(
                      month,
                      group.groupId
                        ? { groupId: group.groupId }
                        : { ungrouped: "true" },
                    )}
                  >
                    {group.groupName}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(group.income)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(group.expenses)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(group.net)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {group.transactionCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-surface-muted font-semibold">
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">
                {money(result.data.totals.income)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {money(result.data.totals.expenses)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {money(result.data.totals.net)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {result.data.groups.reduce(
                  (total, group) => total + group.transactionCount,
                  0,
                )}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <p className="mt-4 text-sm text-muted">
          No posted USD income or expenses for this month.
        </p>
      )}
    </Card>
  );
}
