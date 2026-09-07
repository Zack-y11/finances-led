import type {
  ConfirmInputSession,
  CreateAccount,
  CreateAutomationRule,
  CreateCategory,
  CreateEntryGroup,
  CreateLedgerEntry,
  ParseTextCommandRequest,
  ReviewItemsResponse,
  TextIntakeProposal,
  UpdateAccount,
  UpdateAutomationRule,
  UpdateCategory,
  UpdateLedgerEntry,
} from "@finance/contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiRelated = { id: string; name: string };
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
export type AutomationRule = {
  id: string;
  name: string;
  conditionField: "merchant" | "note" | "amount";
  conditionOp: "contains" | "equals" | "less_than" | "greater_than";
  conditionValue: string;
  actionField: "category" | "account";
  actionTargetId: string | null;
  actionTarget: ApiRelated | null;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
};
export type ReviewMetrics = ReviewItemsResponse["metrics"];

export type FinanceApiClientOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

export function createFinanceApiClient({
  baseUrl,
  fetchImpl = fetch,
}: FinanceApiClientOptions) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
        cache: "no-store",
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
      });
    } catch {
      throw new ApiError(
        "Unable to reach the finance API. Check the server and network address.",
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

  return {
    async getLedgerEntries(
      query: Record<string, string | number | undefined> = {},
    ): Promise<LedgerPage> {
      const parameters = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          parameters.set(key, String(value));
        }
      });
      const suffix = parameters.size ? `?${parameters}` : "";
      const payload = await request<{
        data: Record<string, unknown>[];
        pagination: LedgerPage["pagination"];
      }>(`/ledger-entries${suffix}`);
      return {
        data: payload.data.map(normalizeEntry),
        pagination: payload.pagination,
      };
    },
    async getLedgerEntry(id: string) {
      return normalizeEntry(
        await request<Record<string, unknown>>(`/ledger-entries/${id}`),
      );
    },
    getLedgerOptions: () => request<LedgerOptions>("/ledger-entries/options"),
    async createLedgerEntry(input: CreateLedgerEntry) {
      return normalizeEntry(
        await request<Record<string, unknown>>("/ledger-entries", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    },
    async updateLedgerEntry(id: string, input: UpdateLedgerEntry) {
      return normalizeEntry(
        await request<Record<string, unknown>>(`/ledger-entries/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      );
    },
    deleteLedgerEntry: (id: string) =>
      request<{ success: boolean; id: string }>(`/ledger-entries/${id}`, {
        method: "DELETE",
      }),
    async getAccounts() {
      return (await request<Record<string, unknown>[]>("/accounts")).map(
        normalizeAccount,
      );
    },
    async createAccount(input: CreateAccount) {
      return normalizeAccount(
        await request<Record<string, unknown>>("/accounts", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    },
    async updateAccount(id: string, input: UpdateAccount) {
      return normalizeAccount(
        await request<Record<string, unknown>>(`/accounts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      );
    },
    async getCategories() {
      return (await request<Record<string, unknown>[]>("/categories")).map(
        normalizeCategory,
      );
    },
    async createCategory(input: CreateCategory) {
      return normalizeCategory(
        await request<Record<string, unknown>>("/categories", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    },
    async updateCategory(id: string, input: UpdateCategory) {
      return normalizeCategory(
        await request<Record<string, unknown>>(`/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      );
    },
    async getEntryGroups() {
      return (await request<Record<string, unknown>[]>("/entry-groups")).map(
        normalizeGroup,
      );
    },
    async getEntryGroup(id: string): Promise<EntryGroupDetail> {
      const payload = await request<Record<string, unknown>>(
        `/entry-groups/${id}`,
      );
      return {
        ...normalizeGroup(payload),
        ledgerEntries: Array.isArray(payload.ledgerEntries)
          ? payload.ledgerEntries.map((entry) =>
              normalizeEntry(entry as Record<string, unknown>),
            )
          : [],
      };
    },
    async createEntryGroup(input: CreateEntryGroup) {
      return normalizeGroup(
        await request<Record<string, unknown>>("/entry-groups", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    },
    async appendEntryToGroup(groupId: string, input: CreateLedgerEntry) {
      return normalizeEntry(
        await request<Record<string, unknown>>(
          `/entry-groups/${groupId}/entries`,
          { method: "POST", body: JSON.stringify(input) },
        ),
      );
    },
    getMonthlySummary: (month: string) =>
      request<AnalyticsSummary>(
        `/analytics/monthly-summary?month=${encodeURIComponent(month)}`,
      ),
    getMonthlyBreakdown: (month: string) =>
      request<AnalyticsBreakdown>(
        `/analytics/monthly-breakdown?month=${encodeURIComponent(month)}`,
      ),
    getNetHistory: () => request<AnalyticsSummary[]>("/analytics/net-history"),
    parseTextCommand: (input: ParseTextCommandRequest) =>
      request<TextIntakeProposal>("/ai-intake/text", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    getAutomationRules: () => request<AutomationRule[]>("/rules"),
    createAutomationRule: (input: CreateAutomationRule) =>
      request<AutomationRule>("/rules", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    updateAutomationRule: (id: string, input: UpdateAutomationRule) =>
      request<AutomationRule>(`/rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    deleteAutomationRule: (id: string) =>
      request<{ success: boolean; id: string }>(`/rules/${id}`, {
        method: "DELETE",
      }),
    getReviewItems: () => request<ReviewItemsResponse>("/review-items"),
    async confirmReviewItem(id: string, input: ConfirmInputSession) {
      return normalizeEntry(
        await request<Record<string, unknown>>(`/review-items/${id}/confirm`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    },
    dismissReviewItem: (id: string) =>
      request<{ success: boolean; id: string }>(`/review-items/${id}/dismiss`, {
        method: "POST",
      }),
  };
}

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

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export const dateLabel = (value: string) => {
  const iso = value.includes("T") ? value : `${value}T12:00:00`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
};

export const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export type FinanceApiClient = ReturnType<typeof createFinanceApiClient>;
