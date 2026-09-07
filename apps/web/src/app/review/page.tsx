"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import {
  confirmReviewItem,
  dateLabel,
  dismissReviewItem,
  getLedgerOptions,
  getReviewItems,
  money,
  type LedgerOptions,
  type ReviewItem,
  type ReviewMetrics,
} from "@/lib/api";
import { nativeSelectClassName } from "@/lib/utils";

const emptyMetrics: ReviewMetrics = {
  pending: 0,
  highConfidence: 0,
  needsAttention: 0,
};

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [metrics, setMetrics] = useState<ReviewMetrics>(emptyMetrics);
  const [options, setOptions] = useState<LedgerOptions>();
  const [selectedId, setSelectedId] = useState<string>();
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  }>();

  async function load() {
    setLoading(true);
    try {
      const [review, ledgerOptions] = await Promise.all([
        getReviewItems(),
        getLedgerOptions(),
      ]);
      setItems(review.data);
      setMetrics(review.metrics);
      setOptions(ledgerOptions);
      setSelectedId((current) =>
        review.data.some((item) => item.id === current)
          ? current
          : review.data[0]?.id,
      );
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load review queue",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const matchedAccountId =
    options?.accounts.find(
      (account) =>
        account.name.toLowerCase() ===
        selected?.proposal.data.account.toLowerCase(),
    )?.id ??
    options?.accounts[0]?.id ??
    "";
  const matchedCategoryId =
    options?.categories.find(
      (category) =>
        category.name.toLowerCase() ===
        selected?.proposal.data.category.toLowerCase(),
    )?.id ??
    options?.categories[0]?.id ??
    "";
  const selectedAccountId = accountId || matchedAccountId;
  const selectedCategoryId = categoryId || matchedCategoryId;

  function selectItem(id: string) {
    setSelectedId(id);
    setAccountId("");
    setCategoryId("");
    setMessage(undefined);
  }

  async function confirm(item: ReviewItem) {
    if (!selectedAccountId || !selectedCategoryId || acting) return;
    setActing(true);
    setMessage(undefined);
    try {
      const proposal = item.proposal.data;
      await confirmReviewItem(item.id, {
        type: proposal.type,
        amount: proposal.amount,
        currency: proposal.currency,
        merchant: proposal.merchant,
        note: proposal.note,
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        occurredAt: `${proposal.occurredAt}T12:00:00.000Z`,
      });
      setMessage({ tone: "success", text: "Proposal posted to the ledger." });
      await load();
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Failed to confirm proposal",
      });
    } finally {
      setActing(false);
    }
  }

  async function dismiss(id: string) {
    if (acting) return;
    setActing(true);
    setMessage(undefined);
    try {
      await dismissReviewItem(id);
      setMessage({ tone: "success", text: "Proposal dismissed." });
      await load();
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Failed to dismiss proposal",
      });
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="AI review"
        title="Review inbox"
        description="Finish or dismiss structured proposals that were not confirmed during capture. Original command text is not retained."
      />

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Metric label="Pending" value={metrics.pending} />
        <Metric label="High confidence" value={metrics.highConfidence} />
        <Metric label="Needs attention" value={metrics.needsAttention} />
      </section>

      {message ? (
        <p
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.tone === "error"
              ? "border-danger/30 bg-danger-soft/20 text-danger"
              : "border-success/40 bg-success-soft/20 text-ink"
          }`}
        >
          {message.text}
          {message.tone === "success" ? (
            <Link className="ml-3 text-action hover:underline" href="/ledger">
              View ledger
            </Link>
          ) : null}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.2fr)]">
        <Card className="overflow-hidden gap-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-ink">Review queue</h2>
            <p className="mt-1 text-sm text-muted">
              {items.length} pending proposals
            </p>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-muted">Loading review queue…</p>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">
              <p className="font-semibold text-ink">All caught up.</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/capture">Capture an entry</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <button
                  className={`w-full px-5 py-4 text-left transition-colors ${
                    selectedId === item.id
                      ? "border-l-2 border-action bg-action-soft/50"
                      : "hover:bg-surface-muted/60"
                  }`}
                  key={item.id}
                  onClick={() => selectItem(item.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {(item.proposal.confidence * 100).toFixed(0)}%
                        confidence
                      </p>
                      <h3 className="mt-1 font-semibold text-ink">
                        {item.proposal.data.merchant ??
                          item.proposal.data.note ??
                          "Untitled entry"}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {dateLabel(item.proposal.data.occurredAt)} ·{" "}
                        {item.proposal.data.category}
                      </p>
                    </div>
                    <p className="font-bold tabular-nums text-ink">
                      {money(item.proposal.data.amount)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden gap-0">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-action">
                    Text proposal
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">
                    {selected.proposal.data.merchant ?? "Ledger entry"}
                  </h2>
                </div>
                <Badge variant="review">Needs review</Badge>
              </div>
              <div className="grid gap-6 p-5 sm:p-6">
                <section>
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-action" name="sparkles" />
                    <h3 className="font-semibold text-ink">Proposal details</h3>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Detail
                      label="Amount"
                      value={money(selected.proposal.data.amount)}
                    />
                    <Detail label="Type" value={selected.proposal.data.type} />
                    <Detail
                      label="Date"
                      value={dateLabel(selected.proposal.data.occurredAt)}
                    />
                    <Detail
                      label="Currency"
                      value={selected.proposal.data.currency}
                    />
                  </div>
                </section>
                <section className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-muted">
                    Account
                    <select
                      className={`${nativeSelectClassName} mt-1`}
                      onChange={(event) => setAccountId(event.target.value)}
                      value={selectedAccountId}
                    >
                      {options?.accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Category
                    <select
                      className={`${nativeSelectClassName} mt-1`}
                      onChange={(event) => setCategoryId(event.target.value)}
                      value={selectedCategoryId}
                    >
                      {options?.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
                {selected.appliedRules.length ? (
                  <p className="text-sm text-muted">
                    Applied defaults:{" "}
                    {selected.appliedRules.map((rule) => rule.name).join(", ")}
                  </p>
                ) : null}
                <div className="flex justify-end gap-3 border-t border-border pt-4">
                  <Button
                    className="text-danger"
                    disabled={acting}
                    onClick={() => void dismiss(selected.id)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Dismiss
                  </Button>
                  <Button
                    disabled={
                      acting || !selectedAccountId || !selectedCategoryId
                    }
                    onClick={() => void confirm(selected)}
                    size="sm"
                    type="button"
                  >
                    {acting ? "Processing…" : "Confirm and post"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-sm text-muted">
              Select a proposal to inspect it.
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="min-w-0 p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-action">{value}</p>
    </Card>
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
