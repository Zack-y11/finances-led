/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { LedgerEntryForm } from "@/components/ui/ledger-entry-form";
import { StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import {
  dateLabel,
  deleteLedgerEntry,
  getLedgerEntries,
  getLedgerEntry,
  getLedgerOptions,
  money,
  updateLedgerEntry,
  type LedgerEntry,
  type LedgerOptions,
  type LedgerPage,
} from "@/lib/api";

const SEARCH_DEBOUNCE_MS = 350;

export function LedgerView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
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
  const [showFilters, setShowFilters] = useState(false);
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
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    if (searchInput === query) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = searchInput.trim();
      if (trimmed) next.set("search", trimmed);
      else next.delete("search");
      next.delete("page");
      const queryString = next.toString();
      const href = queryString ? `${pathname}?${queryString}` : pathname;
      if (href === `${pathname}${window.location.search}`) return;
      setSelectedId(undefined);
      router.replace(href, { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, query, router, searchInput, searchParams]);


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
    getLedgerEntries({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      type: type === "all" ? undefined : type,
      search: query || undefined,
      accountId: accountId || undefined,
      categoryId: categoryId || undefined,
      groupId: groupId || undefined,
      page,
      pageSize: 20,
    })
      .then((nextResult) => {
        if (active) setResult(nextResult);
      })
      .catch((reason) => {
        if (!active) return;
        setListError(
          reason instanceof Error
            ? reason.message
            : "Could not load ledger entries.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    accountId,
    categoryId,
    endDate,
    groupId,
    page,
    query,
    reload,
    startDate,
    type,
  ]);
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
    if (key !== "page") next.delete("page");
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  function clearAllFilters() {
    setSelectedId(undefined);
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  }

  function formatPeriodLabel() {
    if (startDate && endDate) {
      return `${dateLabel(startDate)} – ${dateLabel(endDate)}`;
    }
    if (startDate) {
      return `From ${dateLabel(startDate)}`;
    }
    if (endDate) {
      return `Through ${dateLabel(endDate)}`;
    }
    return "All time";
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
    <div className="grid gap-6">
      <PageHeading
        eyebrow="Ledger"
        title="Transactions"
        description="Every financial movement recorded in your ledger."
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
      <div className="grid min-w-0 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="surface-card min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  Recent transactions
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Showing {result.pagination.total} entries · {formatPeriodLabel()}
                </p>
              </div>
              {startDate || endDate || query || type !== "all" || accountId || categoryId || groupId ? (
                <button
                  className="button-secondary text-xs"
                  onClick={clearAllFilters}
                  type="button"
                >
                  Reset filters
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-12 2xl:items-end">
              <label className={`order-3 sm:order-none 2xl:col-span-2 ${showFilters ? "" : "!hidden sm:!grid"}`}>
                <span className="mb-1 block text-xs font-medium text-muted">From date</span>
                <input
                  aria-label="Start date"
                  className="field"
                  onChange={(event) =>
                    updateFilter("startDate", event.target.value)
                  }
                  type="date"
                  value={startDate}
                />
              </label>
              <label className={`order-3 sm:order-none 2xl:col-span-2 ${showFilters ? "" : "!hidden sm:!grid"}`}>
                <span className="mb-1 block text-xs font-medium text-muted">To date</span>
                <input
                  aria-label="End date"
                  className="field"
                  onChange={(event) =>
                    updateFilter("endDate", event.target.value)
                  }
                  type="date"
                  value={endDate}
                />
              </label>
              <label className="order-first sm:col-span-2 md:col-span-1 2xl:col-span-4">
                <span className="mb-1 block text-xs font-medium text-muted">Search</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-muted">
                    <Icon className="size-5" name="search" />
                  </span>
                  <input
                    aria-label="Search transactions"
                    className="field !pl-11"
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search transactions..."
                    type="search"
                    value={searchInput}
                  />
                </div>
              </label>
              <button
                aria-expanded={showFilters}
                className="button-secondary order-2 min-h-10 justify-between rounded-full px-4 text-xs sm:!hidden"
                onClick={() => setShowFilters((value) => !value)}
                type="button"
              >
                {showFilters ? "Hide filters" : "Filters"}
              </button>
              <label className={`order-3 sm:order-none 2xl:col-span-3 ${showFilters ? "" : "!hidden sm:!grid"}`}>
                <span className="mb-1 block text-xs font-medium text-muted">Type</span>
                <select
                  aria-label="Transaction type"
                  className="field !min-h-10 !rounded-full !bg-surface-muted !py-2 text-xs font-semibold"
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
              </label>
              <label className={`order-3 sm:order-none 2xl:col-span-3 ${showFilters ? "" : "!hidden sm:!grid"}`}>
                <span className="mb-1 block text-xs font-medium text-muted">Account</span>
                <select
                  aria-label="Account"
                  className="field !min-h-10 !rounded-full !bg-surface-muted !py-2 text-xs font-semibold"
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
              </label>
              <label className={`order-3 sm:order-none 2xl:col-span-3 ${showFilters ? "" : "!hidden sm:!grid"}`}>
                <span className="mb-1 block text-xs font-medium text-muted">Category</span>
                <select
                  aria-label="Category"
                  className="field !min-h-10 !rounded-full !bg-surface-muted !py-2 text-xs font-semibold"
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
              </label>
              <label className={`order-3 sm:order-none 2xl:col-span-3 ${showFilters ? "" : "!hidden sm:!grid"}`}>
                <span className="mb-1 block text-xs font-medium text-muted">Group</span>
                <select
                  aria-label="Group"
                  className="field !min-h-10 !rounded-full !bg-surface-muted !py-2 text-xs font-semibold"
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
              </label>
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
                    {entry.type === "income" ? "+" : "-"}
                    {money(entry.amount)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-action-soft px-2.5 py-1 text-xs font-semibold text-action">
                    {entry.category.name}
                  </span>
                  <EntryStatus status={entry.status} />
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
                      <EntryStatus status={entry.status} />
                    </td>
                    <td
                      className={
                        entry.type === "income"
                          ? "px-5 py-4 text-right font-bold text-success tabular-nums"
                          : "px-5 py-4 text-right font-bold text-danger tabular-nums"
                      }
                    >
                      {entry.type === "income" ? "+" : "-"}
                      {money(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-muted">Loading ledger entries…</p>
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
        <aside className="surface-card overflow-hidden 2xl:sticky 2xl:top-24">
          <div className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-4">
            <h2 className="font-semibold text-ink">Transaction details</h2>
            <button
              aria-label="Close details"
              className="text-muted"
              onClick={() => setSelectedId(undefined)}
              type="button"
            >
              ×
            </button>
          </div>
          {detailError ? (
            <p className="p-5 text-sm text-danger">{detailError}</p>
          ) : selected ? (
            <EntryDetails
              entry={selected}
              onDeleted={() => {
                setSelectedId(undefined);
                setNotice("Transaction removed from your ledger.");
                setReload((v) => v + 1);
              }}
              onUpdated={() => {
                setNotice("Transaction updated successfully.");
                setReload((v) => v + 1);
              }}
              options={options}
            />
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

function EntryStatus({ status }: { status: LedgerEntry["status"] }) {
  const tone =
    status === "needs_review"
      ? "bg-review-soft text-review"
      : status === "ignored"
        ? "bg-surface-muted text-muted"
        : "bg-success-soft text-[#047857]";
  const dot =
    status === "needs_review"
      ? "bg-review"
      : status === "ignored"
        ? "bg-muted"
        : "bg-success";
  const label = status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
function EntryDetails({
  entry,
  options,
  onUpdated,
  onDeleted,
}: {
  entry: LedgerEntry;
  options: LedgerOptions | null;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const [type, setType] = useState<LedgerEntry["type"]>(entry.type);
  const [amount, setAmount] = useState(String(entry.amount));
  const [merchant, setMerchant] = useState(entry.merchant || "");
  const [accountId, setAccountId] = useState(entry.account.id);
  const [categoryId, setCategoryId] = useState(entry.category.id);
  const [occurredAt, setOccurredAt] = useState(entry.occurredAt.slice(0, 10));
  const [note, setNote] = useState(entry.note || "");

  useEffect(() => {
    setType(entry.type);
    setAmount(String(entry.amount));
    setMerchant(entry.merchant || "");
    setAccountId(entry.account.id);
    setCategoryId(entry.category.id);
    setOccurredAt(entry.occurredAt.slice(0, 10));
    setNote(entry.note || "");
    setEditing(false);
    setDeleting(false);
    setError(undefined);
  }, [entry]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    setSaving(true);
    try {
      await updateLedgerEntry(entry.id, {
        type,
        amount: numAmount,
        merchant: merchant.trim() || null,
        accountId,
        categoryId,
        occurredAt: `${occurredAt}T12:00:00.000Z`,
        note: note.trim() || null,
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(undefined);
    setSaving(true);
    try {
      await deleteLedgerEntry(entry.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form className="grid gap-4 p-5 text-sm" onSubmit={handleSave}>
        {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
        <label className="text-xs font-medium text-muted">
          Type
          <select
            className="field mt-1"
            onChange={(e) => setType(e.target.value as LedgerEntry["type"])}
            value={type}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Amount
          <input
            className="field mt-1"
            min="0.01"
            onChange={(e) => setAmount(e.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Merchant / Vendor
          <input
            className="field mt-1"
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Merchant name"
            value={merchant}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Account
          <select
            className="field mt-1"
            onChange={(e) => setAccountId(e.target.value)}
            value={accountId}
          >
            {options?.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Category
          <select
            className="field mt-1"
            onChange={(e) => setCategoryId(e.target.value)}
            value={categoryId}
          >
            {options?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Date
          <input
            className="field mt-1"
            onChange={(e) => setOccurredAt(e.target.value)}
            required
            type="date"
            value={occurredAt}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Note
          <textarea
            className="field mt-1 min-h-20"
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            value={note}
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="button-secondary text-xs"
            onClick={() => setEditing(false)}
            type="button"
          >
            Cancel
          </button>
          <button className="button-primary text-xs" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    );
  }

  if (deleting) {
    return (
      <div className="grid gap-4 p-5 text-sm">
        <p className="font-semibold text-danger">Delete Transaction?</p>
        <p className="text-xs text-muted leading-relaxed">
          Are you sure you want to remove <strong>{entry.merchant}</strong> ({money(entry.amount)}) from your financial records? This action is logged in audit logs.
        </p>
        {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="button-secondary text-xs"
            onClick={() => setDeleting(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button-primary text-xs"
            disabled={saving}
            onClick={handleDelete}
            type="button"
          >
            {saving ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    );
  }

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
          {entry.type === "income" ? "+" : "-"}
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
      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          className="button-secondary text-xs flex-1"
          onClick={() => setEditing(true)}
          type="button"
        >
          Edit transaction
        </button>
        <button
          className="button-secondary text-xs text-danger"
          onClick={() => setDeleting(true)}
          type="button"
        >
          Delete
        </button>
      </div>
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
