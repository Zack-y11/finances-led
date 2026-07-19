"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { TransactionList } from "@/components/ui/transaction-list";
import { currentMonth, getLedgerEntries, getMonthlyBreakdown, getMonthlySummary, getNetHistory, money, type AnalyticsBreakdown, type AnalyticsSummary, type LedgerEntry } from "@/lib/api";

const month = currentMonth();

export default function OverviewPage() {
  const [summary, setSummary] = useState<AnalyticsSummary>();
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown>();
  const [history, setHistory] = useState<AnalyticsSummary[]>([]);
  const [recent, setRecent] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([getMonthlySummary(month), getMonthlyBreakdown(month), getNetHistory(), getLedgerEntries({ pageSize: 4 })]).then(([nextSummary, nextBreakdown, nextHistory, nextRecent]) => { setSummary(nextSummary); setBreakdown(nextBreakdown); setHistory(nextHistory); setRecent(nextRecent.data); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load the financial overview."));
  }, []);

  const maxExpense = Math.max(...(breakdown?.expenses.map((item) => item.amount) ?? [1]));
  const maxNet = Math.max(...history.map((item) => Math.abs(item.net)), 1);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
  return <div className="grid gap-8">
    <PageHeading eyebrow="Financial overview" title="Make the month visible." description="A clear view of income, spending, and the net you have left to direct." action={<Link className="button-primary shrink-0" href="/ledger"><Icon className="size-4" name="plus" />Add entry</Link>} />
    {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    {!summary && !error ? <LoadingCard label="Loading financial overview…" /> : null}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Income" value={summary ? money(summary.income) : "—"} icon="trend-up" tone="success" /><Metric label="Expenses" value={summary ? money(summary.expenses) : "—"} icon="trend-down" tone="danger" /><Metric label="Net position" value={summary ? money(summary.net) : "—"} icon="wallet" tone="success" /><Metric label="Tracked month" value={monthLabel} icon="chart" tone="action" /></section>
    <section className="grid gap-6 lg:grid-cols-5"><div className="surface-card p-5 sm:p-6 lg:col-span-3"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-ink">Net history</h2><p className="mt-1 text-sm text-muted">Income less expenses, by month.</p></div><Icon className="text-action" name="chart" /></div><div className="mt-8 flex h-48 items-end gap-3">{history.length ? history.map((item) => <div key={item.month} className="flex flex-1 flex-col items-center gap-2"><div className={item.net >= 0 ? "w-full rounded-t-md bg-success/80" : "w-full rounded-t-md bg-danger/80"} style={{ height: `${Math.max(16, (Math.abs(item.net) / maxNet) * 100)}%` }} /><span className="text-[11px] text-muted">{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(`${item.month}-01T12:00:00`))}</span></div>) : <p className="text-sm text-muted">No history available yet.</p>}</div></div><div className="surface-card p-5 sm:p-6 lg:col-span-2"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-ink">Expense categories</h2><p className="mt-1 text-sm text-muted">Where the month is going.</p></div><Link className="text-sm font-semibold text-action hover:underline" href="/ledger">View ledger</Link></div><div className="mt-6 grid gap-4">{breakdown?.expenses.length ? breakdown.expenses.map((item) => <div key={item.category}><div className="flex justify-between gap-4 text-sm"><span className="truncate text-ink">{item.category}</span><span className="tabular-nums font-semibold text-ink">{money(item.amount)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-action" style={{ width: `${(item.amount / maxExpense) * 100}%` }} /></div></div>) : <p className="text-sm text-muted">No expense categories for this month.</p>}</div></div></section>
    <section className="surface-card p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-ink">Recent activity</h2><p className="mt-1 text-sm text-muted">Your latest entries and their financial context.</p></div><Link className="hidden text-sm font-semibold text-action hover:underline sm:block" href="/ledger">See all entries</Link></div><div className="mt-4"><TransactionList compact items={recent} /></div></section>
  </div>;
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: "trend-up" | "trend-down" | "wallet" | "chart"; tone: "success" | "danger" | "action" }) { const className = tone === "success" ? "bg-success-soft text-success" : tone === "danger" ? "bg-danger-soft text-danger" : "bg-action-soft text-action"; return <div className="surface-card p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted">{label}</p><span className={"flex size-9 items-center justify-center rounded-lg " + className}><Icon className="size-4" name={icon} /></span></div><p className="mt-5 text-2xl font-bold tracking-tight text-ink tabular-nums">{value}</p></div>; }