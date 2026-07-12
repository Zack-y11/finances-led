import {z} from "zod";

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
    ocurredAt: z.string().datetime(),
    merchant: z.string().trim().min(1).optional(),
    categoryId: z.string().uuid().optional(),
    accountId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    note: z.string().trim().max(500).optional(),
    inputMethod: inputMethodSchema.default("manual"),
    confidence: z.number().min(0).max(1).optional(),
})

export type transactionType = z.infer<typeof transactionTypeSchema>
export type createLedgerEntry = z.infer<typeof createLedgerEntrySchema>