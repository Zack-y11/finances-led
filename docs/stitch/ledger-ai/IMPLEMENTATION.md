# Ledger AI implementation status

This file tracks what the design exports currently map to in the app. The
authoritative product phases remain in `docs/roadmap.md`.

## API coverage

Live endpoints:

- `GET /health`
- `GET /ledger-entries`, `POST /ledger-entries`, `GET /ledger-entries/:id`, `PATCH /ledger-entries/:id`, `DELETE /ledger-entries/:id`, `GET /ledger-entries/options`
- `GET /entry-groups`, `POST /entry-groups`, `GET /entry-groups/:id`, `POST /entry-groups/:id/entries`
- `GET /accounts`, `POST /accounts`, `PATCH /accounts/:id`
- `GET /categories`, `POST /categories`, `PATCH /categories/:id`
- `GET /analytics/monthly-summary?month=YYYY-MM`
- `GET /analytics/monthly-breakdown?month=YYYY-MM` returning `expenses` and `income`
- `GET /analytics/net-history`

- `POST /ai-intake/text` returning and persisting a structured proposal without
  retaining the raw command.
- `GET /review-items`, `POST /review-items/:id/confirm`, and
  `POST /review-items/:id/dismiss` for explicit proposal resolution.
- `GET /rules`, `POST /rules`, `PATCH /rules/:id`, and `DELETE /rules/:id` for
  typed, owned automation rules.

Not yet implemented: voice processing, receipt processing, or ledger reversal.

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
- `/capture` — live text proposal preview with confirm and dismiss actions.
- `/review` — live pending proposal inbox.
- `/rules` — live typed rule management.

## Mobile route map

Live Expo routes:

- `/` — current-month summary and recent ledger activity.
- `/explore` — searchable ledger with edit and delete actions.
- `/capture` — manual entry and text proposal confirmation.
- `/groups` and `/groups/[id]` — group creation, history, and append-entry flow.
- `/review` — pending proposal confirmation and dismissal.
- `/rules` — typed rule creation, toggle, and deletion.
- `/settings/entities` — account/category creation and account activation.

Voice and receipt design routes remain non-production previews.

## Delivery notes

- Accounts are deactivated instead of hard-deleted so historical ledger entries keep their account relation.
- Categories are editable only; there is no delete affordance because the current schema has no category active flag.
- Monthly breakdown uses the existing analytics route and now partitions both income and expense category totals.
- The web UI uses existing semantic tokens, `.surface-card`, `.field`, and the current shell rather than a second styling system.
- Web and mobile use the shared normalized client in `packages/api-client`.
- Android is the first supported native build target for the MVP.
