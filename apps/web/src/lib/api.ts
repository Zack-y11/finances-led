"use client";

import type {
  CreateAccount,
  CreateCategory,
  CreateEntryGroup,
  CreateLedgerEntry,
  UpdateAccount,
  UpdateCategory,
} from "@finance/contracts";

const baseUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiRelated = { id: string; name: string };

export type Account = {
  id: string;
  name: string;
  type: "bank" | "cash" | "wallet" | "credit_card";
  currency: string;
  isActive: boolean;
};

export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense" | "both";
};

export type LedgerEntry = {
  id: string;
  type: "income" | "expense" | "adjustment";
  amount: number;
  merchant: string;
  note?: string | null;
  occurredAt: string;
  inputMethod: string;
  status: string;
  account: ApiRelated;
  category: ApiRelated;
  group?: ApiRelated | null;
};

export type LedgerOptions = {
  accounts: ApiRelated[];
  categories: Array<ApiRelated & { kind: string }>;
  groups: Array<ApiRelated & { type: string }>;
};

export type LedgerPage = {
  data: LedgerEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type EntryGroup = {
  id: string;
  name: string;
  type: "income" | "expense" | "mixed";
  description?: string | null;
  total: number;
  createdAt: string;
};

export type EntryGroupDetail = EntryGroup & { ledgerEntries: LedgerEntry[] };
export type AnalyticsSummary = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};
export type AnalyticsBreakdown = {
  expenses: Array<{ category: string; amount: number }>;
  income: Array<{ category: string; amount: number }>;
};

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAccount(value: Record<string, unknown>): Account {
  const rawType = String(value.type ?? "cash").toLowerCase();
  return {
    id: String(value.id),
    name: String(value.name),
    type:
      rawType === "bank" || rawType === "wallet" || rawType === "credit_card"
        ? rawType
        : "cash",
    currency: String(value.currency ?? "USD").toUpperCase(),
    isActive: value.isActive !== false,
  };
}

function normalizeCategory(value: Record<string, unknown>): Category {
  const rawKind = String(value.kind ?? "expense").toLowerCase();
  return {
    id: String(value.id),
    name: String(value.name),
    kind: rawKind === "income" || rawKind === "both" ? rawKind : "expense",
  };
}

function normalizeEntry(value: Record<string, unknown>): LedgerEntry {
  const related = (input: unknown): ApiRelated => {
    const item = input as Record<string, unknown> | null;
    return {
      id: String(item?.id ?? ""),
      name: String(item?.name ?? "Uncategorized"),
    };
  };
  const rawType = String(value.type ?? "expense").toLowerCase();
  return {
    id: String(value.id),
    type:
      rawType === "income" || rawType === "adjustment" ? rawType : "expense",
    amount: numberValue(value.amount),
    merchant: String(value.merchant ?? value.note ?? "Untitled entry"),
    note: typeof value.note === "string" ? value.note : null,
    occurredAt: String(value.occurredAt),
    inputMethod: String(value.inputMethod ?? "manual").toLowerCase(),
    status: String(value.status ?? "posted").toLowerCase(),
    account: related(value.account),
    category: related(value.category),
    group: value.group ? related(value.group) : null,
  };
}

function normalizeGroup(value: Record<string, unknown>): EntryGroup {
  const rawType = String(value.type ?? "mixed").toLowerCase();
  return {
    id: String(value.id),
    name: String(value.name),
    type: rawType === "income" || rawType === "expense" ? rawType : "mixed",
    description:
      typeof value.description === "string" ? value.description : null,
    total: numberValue(value.total),
    createdAt: String(value.createdAt ?? ""),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(
      "Unable to reach the finance API. Check that it is running and try again.",
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message[0]
      : body?.message;
    throw new ApiError(
      message ?? "The request could not be completed.",
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export async function getLedgerEntries(
  query: Record<string, string | number | undefined> = {},
): Promise<LedgerPage> {
  const parameters = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") parameters.set(key, String(value));
  });
  const payload = await request<{
    data: Record<string, unknown>[];
    pagination: LedgerPage["pagination"];
  }>(`/ledger-entries?${parameters}`);
  return {
    data: payload.data.map(normalizeEntry),
    pagination: payload.pagination,
  };
}

export async function getLedgerEntry(id: string): Promise<LedgerEntry> {
  return normalizeEntry(
    await request<Record<string, unknown>>(`/ledger-entries/${id}`),
  );
}
export async function getLedgerOptions(): Promise<LedgerOptions> {
  return request<LedgerOptions>("/ledger-entries/options");
}
export async function createLedgerEntry(
  input: CreateLedgerEntry,
): Promise<LedgerEntry> {
  return normalizeEntry(
    await request<Record<string, unknown>>("/ledger-entries", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}
export async function getAccounts(): Promise<Account[]> {
  return (await request<Record<string, unknown>[]>("/accounts")).map(
    normalizeAccount,
  );
}
export async function createAccount(input: CreateAccount): Promise<Account> {
  return normalizeAccount(
    await request<Record<string, unknown>>("/accounts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}
export async function updateAccount(
  id: string,
  input: UpdateAccount,
): Promise<Account> {
  return normalizeAccount(
    await request<Record<string, unknown>>(`/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  );
}
export async function getCategories(): Promise<Category[]> {
  return (await request<Record<string, unknown>[]>("/categories")).map(
    normalizeCategory,
  );
}
export async function createCategory(input: CreateCategory): Promise<Category> {
  return normalizeCategory(
    await request<Record<string, unknown>>("/categories", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}
export async function updateCategory(
  id: string,
  input: UpdateCategory,
): Promise<Category> {
  return normalizeCategory(
    await request<Record<string, unknown>>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  );
}
export async function getEntryGroups(): Promise<EntryGroup[]> {
  return (await request<Record<string, unknown>[]>("/entry-groups")).map(
    normalizeGroup,
  );
}
export async function getEntryGroup(id: string): Promise<EntryGroupDetail> {
  const payload = await request<Record<string, unknown>>(`/entry-groups/${id}`);
  return {
    ...normalizeGroup(payload),
    ledgerEntries: Array.isArray(payload.ledgerEntries)
      ? payload.ledgerEntries.map((entry) =>
          normalizeEntry(entry as Record<string, unknown>),
        )
      : [],
  };
}
export async function createEntryGroup(
  input: CreateEntryGroup,
): Promise<EntryGroup> {
  return normalizeGroup(
    await request<Record<string, unknown>>("/entry-groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}
export async function appendEntryToGroup(
  groupId: string,
  input: CreateLedgerEntry,
): Promise<LedgerEntry> {
  return normalizeEntry(
    await request<Record<string, unknown>>(`/entry-groups/${groupId}/entries`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}
export async function getMonthlySummary(
  month: string,
): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>(
    `/analytics/monthly-summary?month=${encodeURIComponent(month)}`,
  );
}
export async function getMonthlyBreakdown(
  month: string,
): Promise<AnalyticsBreakdown> {
  return request<AnalyticsBreakdown>(
    `/analytics/monthly-breakdown?month=${encodeURIComponent(month)}`,
  );
}
export async function getNetHistory(): Promise<AnalyticsSummary[]> {
  return request<AnalyticsSummary[]>("/analytics/net-history");
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
export const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
