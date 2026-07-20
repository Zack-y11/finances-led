import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { DemoNotice } from "@/components/ui/demo-notice";

const queue = [
  {
    merchant: "Dinner at Gusto's",
    kind: "Quick capture",
    amount: "$85.50",
    confidence: "High confidence",
    active: true,
  },
  {
    merchant: "Unidentified merchant",
    kind: "Receipt scan",
    amount: "$12.00",
    confidence: "Low confidence",
  },
  {
    merchant: "Shared Uber",
    kind: "Group expense",
    amount: "$18.50",
    confidence: "Split pending",
  },
];

export default function ReviewPage() {
  return (
    <div className="grid gap-8">
      <PageHeading
        eyebrow="Review inbox"
        title="Keep automation explainable."
        description="Every proposal is shown with its source, interpretation, confidence, and a clear next action."
      />
      <DemoNotice feature="Review inbox" />
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Pending review" value="12" tone="action" />
        <Metric label="High confidence" value="8" tone="success" />
        <Metric label="Needs attention" value="4" tone="review" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.2fr)]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-ink">Queue</h2>
            <p className="mt-1 text-sm text-muted">
              Demo queue; receipt media processing is not connected.
            </p>
          </div>
          <div className="divide-y divide-border">
            {queue.map((item) => (
              <article
                className={
                  item.active
                    ? "border-l-2 border-action bg-action-soft/50 px-5 py-4"
                    : "px-5 py-4"
                }
                key={item.merchant}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {item.kind}
                    </p>
                    <h3 className="mt-1 font-semibold text-ink">
                      {item.merchant}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{item.confidence}</p>
                  </div>
                  <p className="font-bold text-ink tabular-nums">
                    {item.amount}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <article className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-action">
                Quick capture
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">
                Dinner at Gusto&apos;s
              </h2>
            </div>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
              High confidence
            </span>
          </div>
          <div className="grid gap-6 p-5 sm:p-6">
            <section className="rounded-xl border border-border bg-surface-muted/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Original command
              </p>
              <p className="mt-2 text-sm leading-6 text-ink">
                “I spent 85.50 on dinner at Gusto&apos;s yesterday with Mark.”
              </p>
            </section>
            <section>
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-action" name="sparkles" />
                <h3 className="font-semibold text-ink">AI interpretation</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Detail label="Amount" value="$85.50" />
                <Detail label="Category" value="Dining" />
                <Detail label="Account" value="BAC Checking" />
                <Detail label="Date" value="Yesterday" />
              </div>
            </section>
            <section className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">Confidence evidence</p>
                <span className="text-sm font-bold text-success">98%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full w-[98%] rounded-full bg-success" />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                Known merchant pattern and a matching account preference
                informed this suggestion.
              </p>
            </section>
            <div className="flex flex-wrap gap-3">
              <button
                aria-disabled="true"
                className="button-primary"
                disabled
                type="button"
              >
                Confirm unavailable
              </button>
              <button
                aria-disabled="true"
                className="button-secondary"
                disabled
                type="button"
              >
                Edit unavailable
              </button>
              <button
                aria-disabled="true"
                className="ml-auto text-sm font-semibold text-muted"
                disabled
                type="button"
              >
                Ignore unavailable
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "action" | "success" | "review";
}) {
  const styles =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "review"
        ? "bg-review-soft text-review"
        : "bg-action-soft text-action";
  return (
    <div className="surface-card p-5">
      <span
        className={"rounded-full px-2 py-1 text-xs font-semibold " + styles}
      >
        {label}
      </span>
      <p className="mt-5 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </div>
  );
}
