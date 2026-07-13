import { z } from "zod";

export const transactionTypeSchema = z.enum([
    "income",
    "expense",
    "adjustment",
])

export const inputMethodSchema = z.enum([
    "manual",
    "text",
    "voice",
    "receipt",
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

export type TransactionType = z.infer<typeof transactionTypeSchema>
export type CreateLedgerEntry = z.infer<typeof createLedgerEntrySchema>
