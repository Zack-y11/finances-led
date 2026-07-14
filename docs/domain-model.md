# Domain Model

This document describes the durable concepts behind the product. Keep it aligned
with `packages/database/prisma/schema.prisma` and `packages/contracts`.

## Ledger Entry

A ledger entry is the core financial event.

Current fields:

- `id`
- `userId`
- `type`: `INCOME`, `EXPENSE`, or `ADJUSTMENT`
- `amount`
- `currency`
- `accountId`
- `categoryId`
- `groupId`
- `merchant`
- `note`
- `occurredAt`
- `monthKey`
- `inputMethod`: `MANUAL`, `TEXT`, `VOICE`, or `RECEIPT`
- `confidence`
- `status`: `POSTED`, `NEEDS_REVIEW`, or `IGNORED`

Important invariants:

- `amount` is stored as a positive decimal. Direction comes from `type`.
- `monthKey` is derived from `occurredAt` in `YYYY-MM` format.
- User-owned references must be checked before writes.
- Low-confidence parsed entries should use `NEEDS_REVIEW` instead of `POSTED`.

## Entry Group

An entry group is a parent event for related ledger entries, such as:

- `Gasto semanal - Julio`
- `Hackathon expenses`
- `Universidad`
- `Viaje`

Group totals should be calculated from child entries:

```sql
SELECT SUM(amount)
FROM ledger_entries
WHERE group_id = $1;
```

Do not store a mutable group total unless a future performance issue proves it
is necessary.

## Account

An account represents where money came from or went through:

- BAC
- Cash
- Banco Agricola
- Wallet
- Credit card

Accounts are user-owned and can be deactivated instead of deleted.

## Category

A category is a user-owned finance label:

- Salary
- Freelance
- Food
- Transport
- Utilities
- Education

Category `kind` controls whether it applies to income, expense, or both.

## Merchant

Merchants are currently stored as free text on ledger entries. A future
`Merchant` table should be added when the app needs normalized merchant names,
default categories, or merchant-specific analytics.

Recommended future shape:

```txt
merchants
- id
- user_id
- name
- normalized_name
- default_category_id
```

## Rule

Rules are future deterministic automations. They should be user-owned,
explainable, and ordered by priority.

Recommended future shape:

```txt
rules
- id
- user_id
- condition_type     merchant | phrase | source | amount_range
- condition_value
- action_type        set_category | set_account | set_group
- action_value
- priority
- active
```

Example rules:

```txt
merchant = Starbucks -> category = Food
phrase contains bus -> category = Transport
source = BAC and phrase contains salario -> category = Salary
```

## Input Session

Input sessions are future records of capture attempts. They provide traceability
without retaining raw media.

Recommended future shape:

```txt
input_sessions
- id
- user_id
- modality           text | voice | image | manual
- transcript_text
- parsed_payload
- media_hash
- media_deleted_at
- status
- created_at
```

## Audit Log

Audit logs explain important state changes:

- `CREATE` ledger entry
- `APPEND_TO_GROUP`
- `AUTO_CATEGORIZE`
- `MARK_NEEDS_REVIEW`
- `RULE_APPLIED`
- `MEDIA_DELETED`

Audit metadata can include parser confidence, input method, applied rule ids,
previous values, or group append reason. It should not include raw receipt images
or audio.

## Analytics Views

Monthly net:

```txt
income = SUM(amount where type = INCOME)
expense = SUM(amount where type = EXPENSE)
net = income - expense
```

Breakdowns:

```txt
expense by category
income by category
expense by account
group totals
weekly spending trend
```

Prefer query-backed views first. Add materialized views only after the query
shape and performance needs are clear.
