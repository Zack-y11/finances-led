/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { LedgerEntryForm } from "@/components/ui/ledger-entry-form";
import { StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import {
  currentMonth,
  dateLabel,
  getLedgerEntries,
  getLedgerEntry,
  getLedgerOptions,
  money,
  type LedgerEntry,
  type LedgerOptions,
  type LedgerPage,
} from "@/lib/api";

export function LedgerView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const month =
    monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
      ? monthParam
      : currentMonth();
  const query = searchParams.get("search") || "";
  const typeParam = searchParams.get("type");
  const type: "all" | LedgerEntry["type"] =
    typeParam === "income" ||
    typeParam === "expense" ||
    typeParam === "adjustment"
      ? typeParam
      : "all";
  const accountId = searchParams.get("accountId") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const groupId = searchParams.get("groupId") || "";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const [showForm, setShowForm] = useState(false);
  const [options, setOptions] = useState<LedgerOptions | null>(null);
  const [result, setResult] = useState<LedgerPage>({
    data: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string>();
  const [optionsError, setOptionsError] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [selected, setSelected] = useState<LedgerEntry>();
  const [detailError, setDetailError] = useState<string>();
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let active = true;
    setOptionsError(undefined);
    getLedgerOptions()
      .then((nextOptions) => {
        if (active) setOptions(nextOptions);
      })
      .catch((reason) => {
        if (!active) return;
        setOptionsError(
          reason instanceof Error
            ? reason.message
            : "Could not load ledger options.",
        );
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError(undefined);
    const timer = window.setTimeout(async () => {
      try {
        const nextResult = await getLedgerEntries({
          month,
          type: type === "all" ? undefined : type,
          search: query,
          accountId,
          categoryId,
          groupId,
          page,
          pageSize: 20,
        });
        if (active) setResult(nextResult);
      } catch (reason) {
        if (!active) return;
        setListError(
          reason instanceof Error
            ? reason.message
            : "Could not load ledger entries.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [accountId, categoryId, groupId, month, page, query, reload, type]);
  useEffect(() => {
    let active = true;
    setSelected(undefined);
    if (!selectedId) return;

    setDetailError(undefined);
    getLedgerEntry(selectedId)
      .then((entry) => {
        if (active) setSelected(entry);
      })
      .catch((reason) => {
        if (!active) return;
        setDetailError(
          reason instanceof Error
            ? reason.message
            : "Could not load entry details.",
        );
      });
    return () => {
      active = false;
    };
  }, [selectedId, reload]);

  function saved() {
    setShowForm(false);
    setSelectedId(undefined);
    setNotice("Transaction saved to your ledger.");
    setReload((value) => value + 1);
  }

  function updateFilter(key: string, value: string) {
    setSelectedId(undefined);
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  function updatePage(nextPage: number) {
    setSelectedId(undefined);
    const next = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="grid gap-8">
      <PageHeading
        eyebrow="Transactions"
        title="Your financial record."
        description="Search, review, and capture the financial events that make up your month."
        action={
          <button
            className="button-primary shrink-0"
            onClick={() => setShowForm((value) => !value)}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            New transaction
          </button>
        }
      />
      {showForm ? (
        <LedgerEntryForm
          onCancel={() => setShowForm(false)}
          onSaved={saved}
          options={options}
        />
      ) : null}
      {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
      {optionsError ? (
        <StatusMessage tone="error">{optionsError}</StatusMessage>
      ) : null}
      {listError ? (
        <StatusMessage tone="error">{listError}</StatusMessage>
      ) : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="surface-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  Ledger entries
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    year: "numeric",
                  }).format(new Date(`${month}-01T12:00:00`))}{" "}
                ÿýý {result.pagination.total} matching entries
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label>
                <span className="sr-only">Ledger month</span>
                <input
                  aria-label="Ledger month"
                  className="field"
                  onChange={(event) =>
                    updateFilter("month", event.target.value)
                  }
                  type="month"
                  value={month}
                />
              </label>
              <label className="relative">
                <span className="sr-only">Search transactions</span>
                <Icon
                  className="pointer-events-none absolute left-3 top-[0.85rem] size-4 text-muted"
                  name="search"
                />
                <input
                  className="field pl-9"
                  onChange={(event) =>
                    updateFilter("search", event.target.value)
                  }
                  placeholder="Search transactions"
                  value={query}
                />
              </label>
              <select
                aria-label="Transaction type"
                className="field"
                onChange={(event) =>
                  updateFilter(
                    "type",
                    event.target.value === "all" ? "" : event.target.value,
                  )
                }
                value={type}
              >
                <option value="all">Type: all</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
                <option value="adjustment">Adjustments</option>
              </select>
              <select
                aria-label="Account"
                className="field"
                onChange={(event) =>
                  updateFilter("accountId", event.target.value)
                }
                value={accountId}
              >
                <option value="">All accounts</option>
                {options?.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Category"
                className="field"
                onChange={(event) =>
                  updateFilter("categoryId", event.target.value)
                }
                value={categoryId}
              >
                <option value="">All categories</option>
                {options?.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Group"
                className="field"
                onChange={(event) =>
                  updateFilter("groupId", event.target.value)
                }
                value={groupId}
              >
                <option value="">All groups</option>
                {options?.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="divide-y divide-border md:hidden">
            {result.data.map((entry) => (
              <button
                className={
                  selectedId === entry.id
                    ? "grid w-full gap-3 bg-action-soft/50 p-5 text-left"
                    : "grid w-full gap-3 p-5 text-left active:bg-surface-muted"
                }
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                type="button"
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">
                      {entry.merchant}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {dateLabel(entry.occurredAt)}
                    </span>
                  </span>
                  <span
                    className={
                      entry.type === "income"
                        ? "shrink-0 font-bold text-success tabular-nums"
                        : "shrink-0 font-bold text-danger tabular-nums"
                    }
                  >
                    {entry.type === "income" ? "+" : ""}
                    {money(entry.amount)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-action-soft px-2.5 py-1 text-xs font-semibold text-action">
                    {entry.category.name}
                  </span>
                  <span className="text-xs font-semibold capitalize text-success">
                    {entry.status}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Account</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((entry) => (
                  <tr
                    className={
                      selectedId === entry.id
                        ? "cursor-pointer border-t border-border bg-action-soft/50"
                        : "cursor-pointer border-t border-border hover:bg-surface-muted/70"
                    }
                    key={entry.id}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      {dateLabel(entry.occurredAt)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-ink">
                      {entry.merchant}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-action-soft px-2.5 py-1 text-xs font-semibold text-action">
                        {entry.category.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {entry.account.name}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-success">
                        {entry.status}
                      </span>
                    </td>
                    <td
                      className={
                        entry.type === "income"
                          ? "px-5 py-4 text-right font-bold text-success tabular-nums"
                          : "px-5 py-4 text-right font-bold text-danger tabular-nums"
                      }
                    >
                      {entry.type === "income" ? "+" : ""}
                      {money(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-muted">Loading ledger entries&</p>
          ) : !result.data.length ? (
            <p className="p-5 text-sm text-muted">
              No entries match these filters.
            </p>
          ) : null}
          <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm">
            <span className="text-muted">
              Page {result.pagination.page} of{" "}
              {Math.max(result.pagination.totalPages, 1)}
            </span>
            <div className="flex gap-2">
              <button
                className="button-secondary px-3 py-2 text-xs"
                disabled={loading || page <= 1}
                onClick={() => updatePage(page - 1)}
                type="button"
              >
                Previous
              </button>
              <button
                className="button-secondary px-3 py-2 text-xs"
                disabled={loading || page >= result.pagination.totalPages}
                onClick={() => updatePage(page + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>
        <aside className="surface-card overflow-hidden xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-4">
            <h2 className="font-semibold text-ink">Transaction details</h2>
            <button
              aria-label="Close details"
              className="text-muted"
              onClick={() => setSelectedId(undefined)}
              type="button"
            >
            ÿýý
            </button>
          </div>
          {detailError ? (
            <p className="p-5 text-sm text-danger">{detailError}</p>
          ) : selected ? (
            <EntryDetails entry={selected} />
          ) : (
            <p className="p-5 text-sm text-muted">
              Select an entry to load its current details.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function EntryDetails({ entry }: { entry: LedgerEntry }) {
  return (
    <div className="grid gap-6 p-5">
      <div className="border-b border-border pb-5 text-center">
        <span
          className={
            entry.type === "income"
              ? "mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success"
              : "mx-auto flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger"
          }
        >
          <Icon name={entry.type === "income" ? "trend-up" : "trend-down"} />
        </span>
        <h3 className="mt-3 text-lg font-semibold text-ink">
          {entry.merchant}
        </h3>
        <p
          className={
            entry.type === "income"
              ? "mt-2 text-3xl font-bold text-success tabular-nums"
              : "mt-2 text-3xl font-bold text-danger tabular-nums"
          }
        >
          {entry.type === "income" ? "+" : ""}
          {money(entry.amount)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Detail label="Date" value={dateLabel(entry.occurredAt)} />
        <Detail label="Account" value={entry.account.name} />
        <Detail label="Category" value={entry.category.name} />
        <Detail label="Input method" value={entry.inputMethod} />
      </div>
      {entry.note ? (
        <div className="rounded-xl border border-border bg-surface-muted/60 p-4 text-sm text-muted">
          {entry.note}
        </div>
      ) : null}
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 font-medium capitalize text-ink">{value}</p>
    </div>
  );
}



