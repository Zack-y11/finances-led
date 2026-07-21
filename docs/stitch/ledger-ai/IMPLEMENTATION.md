# Ledger AI implementation status

This file tracks what the design exports currently map to in the app. The authoritative product phases remain in `docs/AI_FINANCE_LEDGER_DEVELOPMENT_GUIDE.md` and `docs/roadmap.md`.

## API coverage

Live endpoints:

- `GET /health`
- `GET /ledger-entries`, `POST /ledger-entries`, `GET /ledger-entries/:id`, `GET /ledger-entries/options`
- `GET /entry-groups`, `POST /entry-groups`, `GET /entry-groups/:id`, `POST /entry-groups/:id/entries`
- `GET /accounts`, `POST /accounts`, `PATCH /accounts/:id`
- `GET /categories`, `POST /categories`, `PATCH /categories/:id`
- `GET /analytics/monthly-summary?month=YYYY-MM`
- `GET /analytics/monthly-breakdown?month=YYYY-MM` returning `expenses` and `income`
- `GET /analytics/net-history`

Not yet implemented: ledger edit, delete, or reversal; text, voice, receipt, rules, and review-inbox execution APIs.

## Web route map

Live routes:

- `/dashboard` — canonical live dashboard with current-month cards, monthly net chart, expense breakdown, income breakdown, and recent transactions.
- `/` — redirects to `/dashboard`.
- `/ledger` — URL-backed month/type/account/category/group/search filters, transaction list, manual create form, and detail pane.
- `/groups` — group list and group creation.
- `/groups/[id]` — group detail, computed total, linked entries, and append-entry form.
- `/settings/accounts` — persistent account list/create/edit and deactivate/reactivate management.
- `/settings/categories` — persistent category list/create/edit management.
- `/settings` — settings hub linking to account and category management.

Design/demo-only routes still present for future phases: `/capture`, `/review`, and `/rules`.

## Delivery notes

- Accounts are deactivated instead of hard-deleted so historical ledger entries keep their account relation.
- Categories are editable only; there is no delete affordance because the current schema has no category active flag.
- Monthly breakdown uses the existing analytics route and now partitions both income and expense category totals.
- The web UI uses existing semantic tokens, `.surface-card`, `.field`, and the current shell rather than a second styling system.
