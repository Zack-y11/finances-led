"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { TransactionList } from "@/components/ui/transaction-list";
import {
  currentMonth,
  getLedgerEntries,
  getMonthlyBreakdown,
  getMonthlySummary,
  getNetHistory,
  money,
  type AnalyticsBreakdown,
  type AnalyticsSummary,
  type LedgerEntry,
} from "@/lib/api";

const month = currentMonth();
const expenseColors = [
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#7c3aed",
  "#8b5cf6",
  "#a78bfa",
];
const incomeColors = [
  "#047857",
  "#059669",
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#0f766e",
  "#14b8a6",
  "#2dd4bf",
];
const maxBreakdownItems = 8;

type BreakdownItem = { category: string; amount: number };

type TooltipPayload = {
  value?: number;
  payload?: { category?: string; label?: string; net?: number };
};

export function DashboardView() {
  const [summary, setSummary] = useState<AnalyticsSummary>();
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown>();
  const [history, setHistory] = useState<AnalyticsSummary[]>([]);
  const [recent, setRecent] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    Promise.all([
      getMonthlySummary(month),
      getMonthlyBreakdown(month),
      getNetHistory(),
      getLedgerEntries({ pageSize: 4 }),
    ])
      .then(([nextSummary, nextBreakdown, nextHistory, nextRecent]) => {
        if (!active) return;
        setSummary(nextSummary);
        setBreakdown(nextBreakdown);
        setHistory(nextHistory);
        setRecent(nextRecent.data);
      })
      .catch((reason) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load the financial overview.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(`${month}-01T12:00:00`)),
    [],
  );
  const historyData = history.map((item) => ({
    ...item,
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit",
    }).format(new Date(`${item.month}-01T12:00:00`)),
  }));

  return (
    <div className="grid gap-8">
      <PageHeading
        eyebrow="Financial overview"
        title={monthLabel}
        description="A clear view of income, spending, and the net you have left to direct."
        action={
          <Link className="button-primary shrink-0" href="/ledger">
            <Icon className="size-4" name="plus" />
            Add entry
          </Link>
        }
      />
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {!summary && !error ? (
        <LoadingCard label="Loading financial overview…" />
      ) : null}
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Income"
          value={summary ? money(summary.income) : "—"}
          icon="trend-up"
          tone="success"
        />
        <Metric
          label="Expenses"
          value={summary ? money(summary.expenses) : "—"}
          icon="trend-down"
          tone="danger"
        />
        <Metric
          label="Net"
          value={summary ? money(summary.net) : "—"}
          icon="wallet"
          tone="success"
        />
      </section>
      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Monthly net</h2>
            <p className="mt-1 text-sm text-muted">
              Income less expenses, by month.
            </p>
          </div>
          <Icon className="text-action" name="chart" />
        </div>
        {historyData.length ? (
          <>
            <div className="mt-6 h-64 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData} margin={{ left: 0, right: 12 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0] as TooltipPayload;
                      return (
                        <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-sm">
                          <p className="font-semibold text-ink">
                            {item.payload?.label}
                          </p>
                          <p className="tabular-nums text-muted">
                            Net {money(Number(item.value ?? 0))}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="net">
                    {historyData.map((item) => (
                      <Cell
                        key={item.month}
                        fill={item.net >= 0 ? "#10b981" : "#ba1a1a"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="sr-only">
              {historyData.map((item) => (
                <li key={item.month}>
                  {item.label}: income {money(item.income)}, expenses{" "}
                  {money(item.expenses)}, net {money(item.net)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-6 text-sm text-muted">No history available yet</p>
        )}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <BreakdownChart
          colors={expenseColors}
          emptyLabel="No expense categories for this month"
          items={breakdown?.expenses ?? []}
          title="Expense breakdown"
        />
        <BreakdownChart
          colors={incomeColors}
          emptyLabel="No income categories for this month"
          items={breakdown?.income ?? []}
          title="Income breakdown"
        />
      </section>
      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Recent transactions
            </h2>
            <p className="mt-1 text-sm text-muted">
              Your latest entries and their financial context.
            </p>
          </div>
          <Link
            className="hidden text-sm font-semibold text-action hover:underline sm:block"
            href="/ledger"
          >
            See all entries
          </Link>
        </div>
        <div className="mt-4">
          <TransactionList compact items={recent} />
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: "trend-up" | "trend-down" | "wallet";
  tone: "success" | "danger";
}) {
  const className =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-danger-soft text-danger";
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          className={
            "flex size-9 items-center justify-center rounded-lg " + className
          }
        >
          <Icon className="size-4" name={icon} />
        </span>
      </div>
      <p className="mt-5 text-2xl font-bold tracking-tight text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}

function BreakdownChart({
  colors,
  emptyLabel,
  items,
  title,
}: {
  colors: string[];
  emptyLabel: string;
  items: BreakdownItem[];
  title: "Expense breakdown" | "Income breakdown";
}) {
  const chartItems =
    items.length > maxBreakdownItems
      ? [
          ...items.slice(0, maxBreakdownItems - 1),
          {
            category: "Other",
            amount: items
              .slice(maxBreakdownItems - 1)
              .reduce((sum, item) => sum + item.amount, 0),
          },
        ]
      : items;

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            Category totals for the selected month.
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-action hover:underline"
          href="/ledger"
        >
          View ledger
        </Link>
      </div>
      {chartItems.length ? (
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,220px)_1fr] md:items-center">
          <div className="h-56 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0] as TooltipPayload;
                    return (
                      <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-sm">
                        <p className="font-semibold text-ink">
                          {item.payload?.category}
                        </p>
                        <p className="tabular-nums text-muted">
                          {money(Number(item.value ?? 0))}
                        </p>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={chartItems}
                  dataKey="amount"
                  innerRadius="58%"
                  nameKey="category"
                  outerRadius="88%"
                  paddingAngle={2}
                >
                  {chartItems.map((item, index) => (
                    <Cell
                      key={item.category}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid gap-3" aria-label={title}>
            {chartItems.map((item, index) => (
              <li
                className="flex items-center justify-between gap-4 text-sm"
                key={item.category}
              >
                <span className="flex min-w-0 items-center gap-2 text-ink">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="truncate">{item.category}</span>
                </span>
                <span className="tabular-nums font-semibold text-ink">
                  {money(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">{emptyLabel}</p>
      )}
    </section>
  );
}
