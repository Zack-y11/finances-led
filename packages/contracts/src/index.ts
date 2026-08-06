import { z } from "zod";

export const transactionTypeSchema = z.enum([
  "income",
  "expense",
  "adjustment",
]);

export const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);


export const ledgerEntriesQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
  month: monthKeySchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(500).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const analyticsMonthQuerySchema = z.object({
  month: monthKeySchema,
});

export const inputMethodSchema = z.enum(["manual", "text", "voice", "receipt"]);

export const entryGroupTypeSchema = z.enum(["income", "expense", "mixed"]);

export const accountTypeSchema = z.enum([
  "bank",
  "cash",
  "wallet",
  "credit_card",
]);

export const categoryKindSchema = z.enum(["income", "expense", "both"]);

const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: accountTypeSchema,
  currency: currencySchema.default("USD"),
});

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    type: accountTypeSchema.optional(),
    currency: currencySchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one account field is required",
  });

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: categoryKindSchema,
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    kind: categoryKindSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one category field is required",
  });

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
});
export const updateLedgerEntrySchema = z
  .object({
    type: transactionTypeSchema.optional(),
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    occurredAt: z.string().datetime({ offset: true }).optional(),
    merchant: z.string().trim().min(1).nullable().optional(),
    categoryId: z.string().uuid().optional(),
    accountId: z.string().uuid().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided for update",
  });


export const createEntryGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: entryGroupTypeSchema,
  description: z.string().trim().max(500).optional(),
});

export const appendEntryToGroupSchema = createLedgerEntrySchema;

export const financeCommandIntentSchema = z.enum(["create_ledger_entry"]);

export const parsedLedgerEntryCommandDataSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().positive(),
  currency: currencySchema.default("USD"),
  merchant: z.string().trim().min(1).optional(),
  account: z.string().trim().min(1),
  category: z.string().trim().min(1),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).optional(),
});

export const parsedFinanceCommandSchema = z.object({
  intent: financeCommandIntentSchema,
  data: parsedLedgerEntryCommandDataSchema,
  confidence: z.number().min(0).max(1),
});

export const parseTextCommandRequestSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  referenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const ruleConditionFieldSchema = z.enum(["merchant", "note", "amount"]);
export const ruleConditionOpSchema = z.enum([
  "contains",
  "equals",
  "less_than",
  "greater_than",
]);
export const ruleActionFieldSchema = z.enum(["category", "account"]);

export const createAutomationRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  conditionField: ruleConditionFieldSchema,
  conditionOp: ruleConditionOpSchema,
  conditionValue: z.string().trim().min(1).max(120),
  actionField: ruleActionFieldSchema,
  actionValue: z.string().trim().min(1).max(120),
  priority: z.coerce.number().int().min(1).default(1),
  isEnabled: z.boolean().default(true),
});

export const updateAutomationRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    conditionField: ruleConditionFieldSchema.optional(),
    conditionOp: ruleConditionOpSchema.optional(),
    conditionValue: z.string().trim().min(1).max(120).optional(),
    actionField: ruleActionFieldSchema.optional(),
    actionValue: z.string().trim().min(1).max(120).optional(),
    priority: z.coerce.number().int().min(1).optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one rule field must be provided for update",
  });

export type CreateAutomationRule = z.infer<typeof createAutomationRuleSchema>;
export type UpdateAutomationRule = z.infer<typeof updateAutomationRuleSchema>;
export type FinanceCommandIntent = z.infer<typeof financeCommandIntentSchema>;
export type ParsedLedgerEntryCommandData = z.infer<
  typeof parsedLedgerEntryCommandDataSchema
>;
export type ParsedFinanceCommand = z.infer<typeof parsedFinanceCommandSchema>;
export type ParseTextCommandRequest = z.infer<
  typeof parseTextCommandRequestSchema
>;

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type LedgerEntriesQuery = z.infer<typeof ledgerEntriesQuerySchema>;
export type AnalyticsMonthQuery = z.infer<typeof analyticsMonthQuerySchema>;
export type EntryGroupType = z.infer<typeof entryGroupTypeSchema>;
export type AccountType = z.infer<typeof accountTypeSchema>;
export type CreateAccount = z.infer<typeof createAccountSchema>;
export type UpdateAccount = z.infer<typeof updateAccountSchema>;
export type CategoryKind = z.infer<typeof categoryKindSchema>;
export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type CreateLedgerEntry = z.infer<typeof createLedgerEntrySchema>;
export type UpdateLedgerEntry = z.infer<typeof updateLedgerEntrySchema>;
export type CreateEntryGroup = z.infer<typeof createEntryGroupSchema>;
export type AppendEntryToGroup = z.infer<typeof appendEntryToGroupSchema>;
