import { z } from "zod";

export const transactionTypeSchema = z.enum([
    "income",
    "expense",
    "adjustment",
])

export const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

export const ledgerEntriesQuerySchema = z.object({
    type: transactionTypeSchema.optional(),
    month: monthKeySchema.optional(),
    categoryId: z.string().uuid().optional(),
    accountId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    search: z.string().trim().min(1).max(500).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const analyticsMonthQuerySchema = z.object({
    month: monthKeySchema,
})

export const inputMethodSchema = z.enum([
    "manual",
    "text",
    "voice",
    "receipt",
])

export const entryGroupTypeSchema = z.enum([
    "income",
    "expense",
    "mixed",
])

export const createLedgerEntrySchema = z.object({
    type: transactionTypeSchema,
    amount: z.number().positive(),
    currency: z.string().length(3).default("USD"),
    occurredAt: z.string().datetime({ offset: true }),
    merchant: z.string().trim().min(1).optional(),
    categoryId: z.string().uuid(),
    accountId: z.string().uuid(),
    note: z.string().trim().max(500).optional(),
    inputMethod: inputMethodSchema.default("manual"),
})

export const createEntryGroupSchema = z.object({
    name: z.string().trim().min(1).max(120),
    type: entryGroupTypeSchema,
    description: z.string().trim().max(500).optional(),
})

export const appendEntryToGroupSchema = createLedgerEntrySchema

export type TransactionType = z.infer<typeof transactionTypeSchema>
export type LedgerEntriesQuery = z.infer<typeof ledgerEntriesQuerySchema>
export type AnalyticsMonthQuery = z.infer<typeof analyticsMonthQuerySchema>
export type EntryGroupType = z.infer<typeof entryGroupTypeSchema>
export type CreateLedgerEntry = z.infer<typeof createLedgerEntrySchema>
export type CreateEntryGroup = z.infer<typeof createEntryGroupSchema>
export type AppendEntryToGroup = z.infer<typeof appendEntryToGroupSchema>
