# Monthly Close Prediction

The dashboard calls `GET /analytics/monthly-close-prediction?month=YYYY-MM` to
answer: “If I keep going, where does this month land?” The optional `asOf`
parameter (`YYYY-MM-DD`) makes the calculation reproducible for tests and
historical views. When it is omitted, the API uses today and clamps it to the
requested month.

The API calculates the response from the requesting development user's
`POSTED` ledger entries only. It never creates forecast ledger rows, audit
events, or recurring transactions.

## Calculation

- Actual income and expenses are the posted entries through the as-of date.
- Variable spend is current-month expense that does not match a detected
  recurring pattern. Its pace is `variable posted expense / elapsed days`.
- Projected variable spend is that daily pace multiplied by remaining days.
- Active recurring patterns expected on or after the as-of date and before the
  month ends are added individually as “still due.” Posted recurring entries
  are excluded from the variable-spend pace so the same item is not counted
  twice.
- Forecast income is posted income plus recurring income still due. One-off
  future income is not invented.
- Forecast expenses are posted expenses plus projected variable spend plus
  recurring expenses still due. Forecast net is forecast income less forecast
  expenses.

The response includes `actual`, `projectedRemaining`, `forecast`, elapsed and
remaining days, the average daily spend assumption, and each recurring item
included in the projection. A completed month has zero remaining days, so its
forecast equals its posted actuals. An empty month has a zero spend pace until
posted history or recurring data provides evidence.

The calculation is deliberately conservative: a missed recurring item is not
backfilled as an overdue transaction, and the forecast is not presented as a
promise. The backend owns the totals; AI commentary, if added later, must not
replace them.
