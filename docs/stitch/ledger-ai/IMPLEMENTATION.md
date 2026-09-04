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

- `POST /ai-intake/text` returning a parsed text finance command proposal; it does not create ledger entries.
- `POST /ai-intake/voice` accepting in-memory audio, transcribing it, storing an `InputSession` trace, and returning a proposal. Raw audio is never persisted.
- `GET /ai-intake/sessions` listing capture traces (transcript, hash, deletion timestamp). No media bytes.
- `GET /rules`, `POST /rules`, `PATCH /rules/:id`, `DELETE /rules/:id`
- `GET /review-items`, `POST /review-items/:id/approve`, `POST /review-items/:id/reject`
- Ledger `PATCH`/`DELETE` and date-range filters.

Not yet implemented: receipt OCR, confirmed text-command auto-execution without the client save step, and Notion sync.

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
- `/capture` — live text and voice capture. Voice uses `POST /ai-intake/voice`, shows the transcript, and saves posted or needs-review ledger entries.
- `/review` — live review inbox for `NEEDS_REVIEW` entries.
- `/rules` — live automation rules.

Design/demo-only routes still present for future phases: receipt-oriented capture only.

## Delivery notes

- Accounts are deactivated instead of hard-deleted so historical ledger entries keep their account relation.
- Categories are editable only; there is no delete affordance because the current schema has no category active flag.
- Monthly breakdown uses the existing analytics route and now partitions both income and expense category totals.
- The web UI uses existing semantic tokens, `.surface-card`, `.field`, and the current shell rather than a second styling system.
