import type { MonthlyClosePrediction } from "@finance/contracts";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/api";

export function MonthlyClosePredictionCard({
  prediction,
}: {
  prediction: MonthlyClosePrediction;
}) {
  const forecastIsPositive = prediction.forecast.net >= 0;
  const netTone = forecastIsPositive ? "text-success" : "text-danger";
  const netSurface = forecastIsPositive
    ? "bg-success-soft text-success"
    : "bg-danger-soft text-danger";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Monthly close prediction
          </h2>
          <p className="mt-1 text-sm text-muted">
            If you keep going at this pace, here&apos;s where the month lands.
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-action-soft text-action">
          <Icon className="size-4" name="sparkles" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
        <div className={`rounded-xl p-4 ${netSurface}`}>
          <p className="text-sm font-medium opacity-80">Forecast net</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {money(prediction.forecast.net)}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Current net {money(prediction.actual.net)}
          </p>
        </div>
        <PredictionMetric
          label="Forecast expenses"
          value={money(prediction.forecast.expenses)}
        />
        <PredictionMetric
          label="Projected from here"
          value={money(prediction.projectedRemaining.expenses)}
          detail={`${prediction.remainingDays} day${
            prediction.remainingDays === 1 ? "" : "s"
          } remaining`}
        />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-ink">
          How this is estimated
        </h3>
        <ul className="mt-3 grid gap-2 text-sm text-muted">
          <li>
            {prediction.remainingDays} day
            {prediction.remainingDays === 1 ? "" : "s"} remain; variable
            spending uses an average of{" "}
            {money(prediction.assumptions.averageDailySpend)}
             per elapsed day.
          </li>
          <li>
            That pace adds{" "}
            {money(prediction.assumptions.projectedVariableSpend)}
             of variable spending to the posted total.
          </li>
          <li>
            {prediction.assumptions.recurringStillDue.length
              ? `${prediction.assumptions.recurringStillDue.length} recurring item${
                  prediction.assumptions.recurringStillDue.length === 1
                    ? ""
                    : "s"
                } still expected, adding ${money(
                  prediction.assumptions.recurringExpensesStillDue,
                )} in expenses.`
              : "No active recurring items are expected in the remaining days."}
          </li>
          <li>
            Income assumes posted income plus only recurring income still due.
          </li>
        </ul>
      </div>

      {prediction.assumptions.recurringStillDue.length ? (
        <div className="mt-4 rounded-lg bg-surface-muted px-3 py-2.5 text-xs text-muted">
          <p className="font-semibold text-ink">Recurring items included</p>
          <ul className="mt-2 grid gap-1.5">
            {prediction.assumptions.recurringStillDue
              .slice(0, 4)
              .map((item) => (
                <li
                  className="flex items-center justify-between gap-3"
                  key={`${item.expectedDate}-${item.type}-${item.merchant}`}
                >
                  <span className="truncate">
                    {item.merchant} · {item.expectedDate}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-ink">
                    {item.type === "expense" ? "−" : "+"}
                    {money(item.amount)}
                  </span>
                </li>
              ))}
          </ul>
          {prediction.assumptions.recurringStillDue.length > 4 ? (
            <p className="mt-2">
              + {prediction.assumptions.recurringStillDue.length - 4} more
              included in the forecast.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className={`mt-4 text-xs ${netTone}`}>
        Forecast only. Predicted amounts never create ledger entries.
      </p>
    </Card>
  );
}

function PredictionMetric({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums text-ink">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
