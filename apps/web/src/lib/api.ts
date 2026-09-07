"use client";

import { createFinanceApiClient } from "@finance/api-client";

const api = createFinanceApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
});

export const {
  appendEntryToGroup,
  confirmReviewItem,
  createAccount,
  createAutomationRule,
  createCategory,
  createEntryGroup,
  createLedgerEntry,
  deleteAutomationRule,
  deleteLedgerEntry,
  dismissReviewItem,
  getAccounts,
  getAutomationRules,
  getCategories,
  getEntryGroup,
  getEntryGroups,
  getLedgerEntries,
  getLedgerEntry,
  getLedgerOptions,
  getMonthlyBreakdown,
  getMonthlySummary,
  getNetHistory,
  getReviewItems,
  parseTextCommand,
  updateAccount,
  updateAutomationRule,
  updateCategory,
  updateLedgerEntry,
} = api;

export {
  ApiError,
  currentMonth,
  dateLabel,
  money,
  type Account,
  type AnalyticsBreakdown,
  type AnalyticsSummary,
  type AutomationRule,
  type Category,
  type EntryGroup,
  type EntryGroupDetail,
  type LedgerEntry,
  type LedgerOptions,
  type LedgerPage,
  type ReviewMetrics,
} from "@finance/api-client";

export type { ReviewItem, ReviewItemsResponse } from "@finance/contracts";
