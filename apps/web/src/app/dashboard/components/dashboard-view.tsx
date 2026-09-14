"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { monthKeySchema } from "@finance/contracts";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { MonthlyClosePredictionCard } from "@/components/ui/monthly-close-prediction-card";
import { PageHeading } from "@/components/ui/page-heading";
import { TransactionList } from "@/components/ui/transaction-list";
import {
  currentMonth,
  dateLabel,
  getLedgerEntries,
  getMonthlyClosePrediction,
  getMonthlyOverview,
  getNetHistory,
  money,
  monthDateRange,
  shiftMonth,
  type AnalyticsCategoryBreakdownItem,
  type AnalyticsMonthOverview,
  type AnalyticsNetHistoryItem,
  type AnalyticsRepeatedSpendingInsight,
  type LedgerEntry,
  type MonthlyClosePrediction,
} from "@/lib/api";

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

type TooltipPayload = {
  value?: number;
  payload?: { category?: string; label?: string; net?: number };
};

function selectedMonth(param: string | null) {
  const parsed = monthKeySchema.safeParse(param);
  return parsed.success ? parsed.data : currentMonth();
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T12:00:00`));
}

function deltaCopy(value: number) {
  if (value === 0) return "Same as last month";
  const amount = money(Math.abs(value));
  return value > 0
    ? `${amount} more than last month`
    : `${amount} less than last month`;
}

function ledgerHref(
  month: string,
  extra: Record<string, string | null | undefined> = {},
) {
  const range = monthDateRange(month);
  const params = new URLSearchParams({
    startDate: range.startDate,
    endDate: range.endDate,
  });
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return `/ledger?${params.toString()}`;
}

export function DashboardView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = selectedMonth(searchParams.get("month"));
  const [overview, setOverview] = useState<AnalyticsMonthOverview>();
  const [prediction, setPrediction] = useState<MonthlyClosePrediction>();
  const [history, setHistory] = useState<AnalyticsNetHistoryItem[]>([]);
  const [recent, setRecent] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string>();

  function setMonth(nextMonth: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextMonth === currentMonth()) next.delete("month");
    else next.set("month", nextMonth);
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  useEffect(() => {
    let active = true;
    const range = monthDateRange(month);
    Promise.all([
      getMonthlyOverview(month),
      getMonthlyClosePrediction(month),
      getNetHistory(),
      getLedgerEntries({
        startDate: range.startDate,
        endDate: range.endDate,
        pageSize: 4,
      }),
    ])
      .then(([nextOverview, nextPrediction, nextHistory, nextRecent]) => {
        if (!active) return;
        setError(undefined);
        setOverview(nextOverview);
        setPrediction(nextPrediction);
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
  }, [month]);

  const historyData = history.map((item) => ({
    ...item,
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit",
    }).format(new Date(`${item.month}-01T12:00:00`)),
  }));
  const summary = overview?.summary;
  const breakdown = overview?.breakdown;

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="Financial overview"
        title={monthLabel(month)}
        description="Pick a month to see where money went, how it compares to last month, and which spend keeps repeating."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              aria-label="Previous month"
              onClick={() => setMonth(shiftMonth(month, -1))}
              size="sm"
              type="button"
              variant="secondary"
            >
              Previous
            </Button>
            <label className="sr-only" htmlFor="analytics-month">
              Month
            </label>
            <Input
              className="h-9 w-[11.5rem] rounded-full px-3 text-sm font-semibold"
              id="analytics-month"
              onChange={(event) => {
                const next = monthKeySchema.safeParse(event.target.value);
                if (next.success) setMonth(next.data);
              }}
              type="month"
              value={month}
            />
            <Button
              aria-label="Next month"
              onClick={() => setMonth(shiftMonth(month, 1))}
              size="sm"
              type="button"
              variant="secondary"
            >
              Next
            </Button>
            <Button asChild className="shrink-0">
              <Link href="/ledger">
                <Icon className="size-4" name="plus" />
                Add entry
              </Link>
            </Button>
          </div>
        }
      />
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {!overview && !error ? (
        <LoadingCard label="Loading financial overview…" />
      ) : null}
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          delta={summary ? deltaCopy(summary.delta.income) : undefined}
          icon="trend-up"
          label="Income"
          tone="success"
          value={summary ? money(summary.income) : "—"}
        />
        <Metric
          delta={summary ? deltaCopy(summary.delta.expenses) : undefined}
          icon="trend-down"
          label="Expenses"
          tone="danger"
          value={summary ? money(summary.expenses) : "—"}
        />
        <Metric
          delta={summary ? deltaCopy(summary.delta.net) : undefined}
          icon="wallet"
          label="Net"
          tone={summary && summary.net < 0 ? "danger" : "success"}
          value={summary ? money(summary.net) : "—"}
        />
      </section>
      {prediction ? (
        <MonthlyClosePredictionCard prediction={prediction} />
      ) : summary && !error ? (
        <LoadingCard label="Calculating monthly close prediction…" />
      ) : null}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Monthly net</h2>
            <p className="mt-1 text-sm text-muted">
              Income less expenses, by month. Selected month is highlighted.
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
                        fill={
                          item.month === month
                            ? item.net >= 0
                              ? "#047857"
                              : "#7f1d1d"
                            : item.net >= 0
                              ? "#10b981"
                              : "#ba1a1a"
                        }
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
      </Card>
      <section className="grid gap-6 lg:grid-cols-2">
        <BreakdownChart
          colors={expenseColors}
          emptyLabel="No expense categories for this month"
          hrefType="expense"
          items={breakdown?.expenses ?? []}
          month={month}
          title="Expense breakdown"
          total={breakdown?.totals.expenses ?? 0}
        />
        <BreakdownChart
          colors={incomeColors}
          emptyLabel="No income categories for this month"
          hrefType="income"
          items={breakdown?.income ?? []}
          month={month}
          title="Income breakdown"
          total={breakdown?.totals.income ?? 0}
        />
      </section>
      <RepeatedSpendingCard insight={overview?.insight ?? null} month={month} />
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Transactions this month
            </h2>
            <p className="mt-1 text-sm text-muted">
              Latest entries in {monthLabel(month)}.
            </p>
          </div>
          <Link
            className="hidden text-sm font-semibold text-action hover:underline sm:block"
            href={ledgerHref(month)}
          >
            See filtered history
          </Link>
        </div>
        <div className="mt-4">
          <TransactionList compact items={recent} />
        </div>
      </Card>
    </div>
  );
}

function Metric({
  delta,
  label,
  value,
  icon,
  tone,
}: {
  delta?: string;
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
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          className={
            "flex size-8 items-center justify-center rounded-lg sm:size-9 " +
            className
          }
        >
          <Icon className="size-4" name={icon} />
        </span>
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight text-ink tabular-nums sm:mt-5 sm:text-2xl">
        {value}
      </p>
      {delta ? <p className="mt-1 text-xs text-muted">{delta}</p> : null}
    </Card>
  );
}

function BreakdownChart({
  colors,
  emptyLabel,
  hrefType,
  items,
  month,
  title,
  total,
}: {
  colors: string[];
  emptyLabel: string;
  hrefType: "income" | "expense";
  items: AnalyticsCategoryBreakdownItem[];
  month: string;
  title: "Expense breakdown" | "Income breakdown";
  total: number;
}) {
  const chartItems =
    items.length > maxBreakdownItems
      ? [
          ...items.slice(0, maxBreakdownItems - 1),
          {
            categoryId: null,
            category: "Other",
            amount: items
              .slice(maxBreakdownItems - 1)
              .reduce((sum, item) => sum + item.amount, 0),
            priorAmount: items
              .slice(maxBreakdownItems - 1)
              .reduce((sum, item) => sum + item.priorAmount, 0),
            delta: items
              .slice(maxBreakdownItems - 1)
              .reduce((sum, item) => sum + item.delta, 0),
            share: items
              .slice(maxBreakdownItems - 1)
              .reduce((sum, item) => sum + item.share, 0),
          } satisfies AnalyticsCategoryBreakdownItem,
        ]
      : items;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            {money(total)} this month, with last month shown beside each
            category.
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-action hover:underline"
          href={ledgerHref(month, { type: hrefType })}
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
              <li key={`${item.categoryId ?? "none"}-${item.category}`}>
                {item.categoryId ? (
                  <Link
                    className="flex items-center justify-between gap-4 text-sm hover:text-action"
                    href={ledgerHref(month, {
                      categoryId: item.categoryId,
                      type: hrefType,
                    })}
                  >
                    <CategoryRow colors={colors} index={index} item={item} />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <CategoryRow colors={colors} index={index} item={item} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">{emptyLabel}</p>
      )}
    </Card>
  );
}

function CategoryRow({
  colors,
  index,
  item,
}: {
  colors: string[];
  index: number;
  item: AnalyticsCategoryBreakdownItem;
}) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2 text-ink">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: colors[index % colors.length] }}
        />
        <span className="min-w-0">
          <span className="block truncate">{item.category}</span>
          <span className="block text-xs text-muted">
            {Math.round(item.share * 100)}% · {deltaCopy(item.delta)}
          </span>
        </span>
      </span>
      <span className="tabular-nums font-semibold text-ink">
        {money(item.amount)}
      </span>
    </>
  );
}

function RepeatedSpendingCard({
  insight,
  month,
}: {
  insight: AnalyticsRepeatedSpendingInsight | null;
  month: string;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Repeated spending</h2>
          <p className="mt-1 text-sm text-muted">
            One recurring merchant from posted history, compared to this month.
          </p>
        </div>
        <Link
          className="hidden text-sm font-semibold text-action hover:underline sm:block"
          href="/rules"
        >
          All patterns
        </Link>
      </div>
      {insight ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink">{insight.merchant}</p>
            <p className="mt-1 text-sm text-muted">
              {insight.cadence} · about {money(insight.medianAmount)} · last{" "}
              {dateLabel(insight.lastOccurredAt)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {insight.monthOccurrenceCount
                ? `${insight.monthOccurrenceCount} time${
                    insight.monthOccurrenceCount === 1 ? "" : "s"
                  } this month for ${money(insight.monthAmount)}`
                : `No posted match in ${monthLabel(month)} yet`}
            </p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link
              href={ledgerHref(month, {
                merchantId: insight.merchantId,
                search: insight.merchantId ? undefined : insight.merchant,
                type: "expense",
              })}
            >
              See in history
            </Link>
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          No weekly, biweekly, or monthly repeats yet. A merchant needs at least
          three similar posted amounts.
        </p>
      )}
    </Card>
  );
}
