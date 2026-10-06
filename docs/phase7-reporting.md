# Phase 7 web reporting

Financial reports use posted USD income and expenses. Adjustments, review/ignored
entries, and other currencies remain in ledger history but do not affect these
reports. Monthly summaries, category totals, net history, group totals, forecasts,
and repeated-spending insights use the same currency/status boundaries.

The dashboard month is stored in the URL. Financial drilldowns use the ledger's
`month` filter, based on persisted `monthKey`, rather than deriving a UTC date
range. Explicit date ranges still take precedence. Read-only report filters are
visible and removable in the ledger.

## Budget versus actual

The dashboard reuses `GET /budgets?month=YYYY-MM`. Each budget displays its scope,
monthly USD limit, posted USD expense total, remaining/over amount, utilization,
and current alert state. Account and category constraints combine with AND.
Overlapping budgets are evaluated independently, never summed into an overall
spend figure. Existing budget alert creation and auditing behavior is preserved.
Past-month comparisons use the current recurring budget configuration, not a
historical snapshot of limits.

## Monthly groups

`GET /analytics/group-breakdown?month=YYYY-MM` returns `AnalyticsGroupBreakdown`:
the month, income/expenses/net totals, and group rows containing `groupId`,
`groupName`, income, expenses, net, and `transactionCount`. Groups with qualifying
entries are ordered by expense total descending, then name. Null group IDs appear
as Ungrouped. Empty months return zero totals and no rows. Names and ledger queries
are scoped to the configured user; legacy group endpoint shapes are unchanged.

## History and CSV

The ledger supports optional `status` (`posted`, `needs_review`, `ignored`) and
uppercase three-letter `currency` filters. `ungrouped=true` selects entries with
no group; `financialOnly=true` selects income and expenses when no explicit type
is supplied. These filters also apply to export.

`GET /ledger-entries/export.csv` accepts the ledger filters, ignores pagination,
and exports all matching entries in timestamp-descending, ID-descending order.
Columns are ID, timestamp, type, amount, currency, merchant, account, category,
group, status, input method, and note. Amounts stay positive; type supplies their
direction. Files use UTF-8 with a BOM, CRLF record separators, escaped text cells,
and formula protection. Empty exports contain the header. No transcripts or raw
media are exported. The web download handles failures and releases its blob URL.

## Verification

Run type checks, lint, unit tests, build, and API integration tests. Integration
fixtures cover mixed currencies/statuses, ownership, month boundaries, budget
overlap, reconciliation, combined filters, and export beyond one page.

To use an isolated test database, set `DATABASE_URL` before running API e2e tests;
explicit environment values take precedence over `.env.local`. Apply existing
migrations and seed that database first. No new migration is required.
