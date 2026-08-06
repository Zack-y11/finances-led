"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import {
  approveReviewItem,
  dateLabel,
  getReviewItems,
  money,
  rejectReviewItem,
  type LedgerEntry,
  type ReviewMetrics,
} from "@/lib/api";

export default function ReviewPage() {
  const [items, setItems] = useState<LedgerEntry[]>([]);
  const [metrics, setMetrics] = useState<ReviewMetrics>({
    pending: 0,
    highConfidence: 0,
    needsAttention: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [acting, setActing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await getReviewItems();
      setItems(response.data);
      setMetrics(response.metrics);
      if (response.data.length > 0) {
        setSelectedId((prev) => (prev ? prev : response.data[0].id));
      } else {
        setSelectedId(undefined);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    const found = items.find((i) => i.id === selectedId);
    setSelected(found || null);
  }, [selectedId, items]);

  async function handleApprove(id: string) {
    setActing(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    try {
      await approveReviewItem(id);
      setActionSuccess("Transaction approved and posted to your ledger!");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to approve proposal");
    } finally {
      setActing(false);
    }
  }

  async function handleReject(id: string) {
    setActing(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    try {
      await rejectReviewItem(id);
      setActionSuccess("Transaction proposal rejected and ignored.");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject proposal");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="AI review"
        title="Review inbox"
        description="Review, verify, and approve AI proposals or low-confidence intake notes before posting them to your financial record."
      />

      <section className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-4">
        <Metric label="Pending review" value={String(metrics.pending)} tone="action" />
        <Metric label="High confidence" value={String(metrics.highConfidence)} tone="success" />
        <Metric label="Needs attention" value={String(metrics.needsAttention)} tone="review" />
      </section>

      {actionSuccess ? (
        <p className="p-4 rounded-xl border border-success/40 bg-success-soft/20 text-sm text-ink font-semibold flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <Link className="text-action text-xs font-semibold hover:underline" href="/ledger">
            View Ledger →
          </Link>
        </p>
      ) : null}

      {actionError ? (
        <p className="p-4 rounded-xl border border-danger/30 bg-danger-soft/20 text-sm text-danger font-medium">
          {actionError}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.2fr)]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-ink">Review Queue</h2>
            <p className="mt-1 text-sm text-muted">
              {items.length} pending proposal{items.length === 1 ? "" : "s"} awaiting approval
            </p>
          </div>

          {loading ? (
            <p className="p-5 text-sm text-muted">Loading review queue...</p>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">
              <p className="font-semibold text-ink">All caught up!</p>
              <p className="mt-1">No transactions are currently awaiting review.</p>
              <Link className="button-primary text-xs mt-4 inline-flex" href="/capture">
                Create new capture →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <button
                  className={`w-full text-left transition-colors px-5 py-4 ${
                    selectedId === item.id
                      ? "border-l-2 border-action bg-action-soft/50"
                      : "hover:bg-surface-muted/60"
                  }`}
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {item.inputMethod} intake
                      </p>
                      <h3 className="mt-1 font-semibold text-ink">
                        {item.merchant}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {dateLabel(item.occurredAt)} · {item.category.name}
                      </p>
                    </div>
                    <p className="font-bold text-ink tabular-nums">
                      {money(item.amount)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <article className="surface-card overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-action">
                    {selected.inputMethod} intake
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">
                    {selected.merchant}
                  </h2>
                </div>
                <span className="rounded-full bg-review-soft px-2.5 py-1 text-xs font-semibold text-review">
                  Needs Review
                </span>
              </div>

              <div className="grid gap-6 p-5 sm:p-6">
                {selected.note ? (
                  <section className="rounded-xl border border-border bg-surface-muted/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Input Command / Note
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink">
                      &ldquo;{selected.note}&rdquo;
                    </p>
                  </section>
                ) : null}

                <section>
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-action" name="sparkles" />
                    <h3 className="font-semibold text-ink">Proposal Details</h3>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Detail label="Amount" value={money(selected.amount)} />
                    <Detail label="Type" value={selected.type} />
                    <Detail label="Category" value={selected.category.name} />
                    <Detail label="Account" value={selected.account.name} />
                    <Detail label="Date" value={dateLabel(selected.occurredAt)} />
                    <Detail label="Status" value={selected.status} />
                  </div>
                </section>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    className="button-secondary text-xs text-danger"
                    disabled={acting}
                    onClick={() => handleReject(selected.id)}
                    type="button"
                  >
                    {acting ? "Processing..." : "Reject & Ignore"}
                  </button>
                  <button
                    className="button-primary text-xs"
                    disabled={acting}
                    onClick={() => handleApprove(selected.id)}
                    type="button"
                  >
                    {acting ? "Posting..." : "Approve & Post to Ledger ✓"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-sm text-muted">
              Select an item from the review queue to inspect proposal details.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "action",
}: {
  label: string;
  value: string;
  tone?: "action" | "success" | "review";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "review"
        ? "bg-review-soft text-review"
        : "bg-action-soft text-action";
  return (
    <div className="surface-card min-w-36 flex-1 p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${toneClasses.split(" ")[1]}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-ink">{value}</p>
    </div>
  );
}
