import Link from "next/link";

import { CreateEntryForm } from "./components/create-entry-form";

type Entry = {
  id: string;
  type: "INCOME" | "EXPENSE" | "ADJUSTMENT";
  amount: string;
  currency: string;
  merchant: string | null;
  account: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  group: { id: string; name: string } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type LedgerData = {
  data: Entry[];
  pagination: Pagination;
  error?: string;
};

type LedgerOptions = {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: string }[];
  groups: { id: string; name: string; type: string }[];
  error?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;
type LedgerFilters = {
  type?: string;
  month?: string;
  categoryId?: string;
  accountId?: string;
  groupId?: string;
  search?: string;
  page?: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const filterKeys = ["type", "month", "categoryId", "accountId", "groupId", "search"] as const;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getFilters(searchParams: SearchParams): LedgerFilters {
  return {
    type: getSingleValue(searchParams.type),
    month: getSingleValue(searchParams.month),
    categoryId: getSingleValue(searchParams.categoryId),
    accountId: getSingleValue(searchParams.accountId),
    groupId: getSingleValue(searchParams.groupId),
    search: getSingleValue(searchParams.search),
    page: getSingleValue(searchParams.page),
  };
}

function toQueryString(filters: LedgerFilters, page = filters.page) {
  const query = new URLSearchParams();
  for (const key of filterKeys) {
    const value = filters[key];
    if (value) query.set(key, value);
  }
  if (page && page !== "1") query.set("page", page);
  return query.toString();
}

function ledgerHref(filters: LedgerFilters, page: number) {
  const query = toQueryString(filters, String(page));
  return query ? `/ledger?${query}` : "/ledger";
}

async function getLedgerData(filters: LedgerFilters): Promise<LedgerData> {
  try {
    const query = toQueryString(filters);
    const response = await fetch(`${apiUrl}/ledger-entries${query ? `?${query}` : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = (await response.json()) as LedgerData;
    if (!Array.isArray(data.data) || !data.pagination) {
      throw new Error("API returned an unexpected ledger response");
    }
    return data;
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Unknown API error";
    return {
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      error: message,
    };
  }
}

async function getLedgerOptions(): Promise<LedgerOptions> {
  try {
    const response = await fetch(`${apiUrl}/ledger-entries/options`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Options API returned ${response.status}`);

    const data = (await response.json()) as LedgerOptions;
    if (!Array.isArray(data.accounts) || !Array.isArray(data.categories) || !Array.isArray(data.groups)) {
      throw new Error("API returned unexpected ledger options");
    }
    return data;
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Unknown API error";
    return { accounts: [], categories: [], groups: [], error: message };
  }
}

export default async function LedgerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = getFilters(await searchParams);
  const [ledger, options] = await Promise.all([getLedgerData(filters), getLedgerOptions()]);
  const { data: entries, pagination } = ledger;
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Ledger</h1>
        <Link href="/groups" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
          Groups
        </Link>
      </div>

      {(ledger.error || options.error) && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load ledger data: {ledger.error ?? options.error}
        </p>
      )}

      <CreateEntryForm accounts={options.accounts} categories={options.categories} />

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Entries</h2>
          <Link href="/ledger" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
            Reset filters
          </Link>
        </div>

        <form action="/ledger" className="grid gap-3 rounded border border-zinc-200 p-4 sm:grid-cols-2">
          <label>
            Month
            <input name="month" className="field" type="month" defaultValue={filters.month} />
          </label>
          <label>
            Type
            <select name="type" className="field" defaultValue={filters.type ?? ""}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </label>
          <label>
            Account
            <select name="accountId" className="field" defaultValue={filters.accountId ?? ""}>
              <option value="">All accounts</option>
              {options.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>
          <label>
            Category
            <select name="categoryId" className="field" defaultValue={filters.categoryId ?? ""}>
              <option value="">All categories</option>
              {options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            Group
            <select name="groupId" className="field" defaultValue={filters.groupId ?? ""}>
              <option value="">All groups</option>
              {options.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label>
            Search
            <input name="search" className="field" defaultValue={filters.search} placeholder="Merchant or note" />
          </label>
          <button className="rounded bg-zinc-900 px-4 py-2 text-white sm:col-span-2 sm:justify-self-start">Apply filters</button>
        </form>

        <div className="grid gap-3">
          {entries.map((entry) => {
            const sign = entry.type === "INCOME" ? "+" : "-";
            return (
              <div key={entry.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-zinc-200 py-2">
                <span>{entry.merchant ?? "—"}</span>
                <span className="text-zinc-600">{entry.group?.name ?? entry.category?.name ?? "Uncategorized"}</span>
                <span>{sign}${Number(entry.amount).toFixed(2)}</span>
              </div>
            );
          })}
          {!entries.length && <p className="text-zinc-500">No matching entries yet.</p>}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 text-sm">
          <span>Showing {start}–{end} of {pagination.total} entries (page {pagination.page} of {pagination.totalPages})</span>
          <div className="flex gap-3">
            {pagination.page > 1 ? (
              <Link href={ledgerHref(filters, pagination.page - 1)} className="font-medium text-zinc-600 hover:text-zinc-950">Previous</Link>
            ) : <span className="text-zinc-400">Previous</span>}
            {pagination.page < pagination.totalPages ? (
              <Link href={ledgerHref(filters, pagination.page + 1)} className="font-medium text-zinc-600 hover:text-zinc-950">Next</Link>
            ) : <span className="text-zinc-400">Next</span>}
          </div>
        </div>
      </section>
    </main>
  );
}
