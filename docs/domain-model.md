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

Merchants are user-owned canonical payees. Ledger entries still store a display
`merchant` string for history, plus an optional `merchantId` pointing at the
canonical record.

Current shape:

```txt
merchants
- id
- user_id
- display_name
- normalized_key
- default_category_id

merchant_aliases
- id
- merchant_id
- user_id
- alias
- normalized_key
```

Incoming names are normalized deterministically (case, punctuation, store
numbers, Inc/LLC suffixes) and matched against `normalized_key` or an alias
before rules run. Users can add aliases, set a default category, and merge
duplicate merchants.

## Rule

Rules are user-owned deterministic automations. They are explainable and ordered
by priority (1 is highest). The first matching rule wins per action field.

Current shape:

```txt
automation_rules
- id
- user_id
- name
- condition_field    merchant | note | amount
- condition_op       contains | equals | less_than | greater_than
- condition_value
- action_field       category | account
- action_value
- priority
- is_enabled
```

Example rules:

```txt
merchant contains Starbucks -> category = Food
phrase contains bus -> category = Transport
amount greater than 50 -> account = Cash
```

## Input Session

Input sessions are capture traces. They provide traceability without retaining
raw media.

Current shape:

```txt
input_sessions
- id
- user_id
- modality           text | voice | image | manual
- transcript_text
- parsed_payload
- media_hash
- media_mime_type
- media_byte_length
- media_deleted_at
- status             processed | needs_review | failed | confirmed
- ledger_entry_id
- created_at
```

## Audit Log

Audit logs explain important state changes:

- `CREATE` ledger entry
- `APPEND_TO_GROUP`
- `AUTO_CATEGORIZE`
- `MARK_NEEDS_REVIEW`
- `RULE_APPLIED`
- `MERCHANT_NORMALIZED`
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
