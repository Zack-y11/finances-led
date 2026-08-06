"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import {
  createLedgerEntry,
  getLedgerOptions,
  money,
  parseTextCommand,
  type LedgerOptions,
} from "@/lib/api";
import type { ParsedFinanceCommand } from "@finance/contracts";

export default function CapturePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedFinanceCommand | null>(null);
  const [options, setOptions] = useState<LedgerOptions | null>(null);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    getLedgerOptions().then((data) => {
      setOptions(data);
    }).catch(() => null);
  }, []);

  useEffect(() => {
    if (!result || !options) return;
    const matchedAccount = options.accounts.find(
      (a) => a.name.toLowerCase() === result.data.account?.toLowerCase(),
    );
    setAccountId(matchedAccount?.id || options.accounts[0]?.id || "");

    const matchedCategory = options.categories.find(
      (c) => c.name.toLowerCase() === result.data.category?.toLowerCase(),
    );
    setCategoryId(matchedCategory?.id || options.categories[0]?.id || "");
  }, [result, options]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResult(null);

    try {
      const parsed = await parseTextCommand({ text: text.trim() });
      setResult(parsed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse text command",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!result || !accountId || !categoryId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const dateStr = result.data.occurredAt || new Date().toISOString().slice(0, 10);
      await createLedgerEntry({
        type: result.data.type,
        amount: result.data.amount,
        currency: result.data.currency || "USD",
        merchant: result.data.merchant || undefined,
        accountId,
        categoryId,
        occurredAt: `${dateStr}T12:00:00.000Z`,
        note: text.trim() || undefined,
        inputMethod: "text",
      });
      setSuccess("Entry saved to your ledger successfully!");
      setResult(null);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save entry to ledger",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto grid max-w-[1000px] gap-6">
      <PageHeading
        eyebrow="Ledger"
        title="Quick capture"
        description="Type a natural financial note in English or Spanish. OpenAI (gpt-5.6-luna) parses your command into a structured transaction proposal."
      />
      <div className="rounded-xl border border-action/20 bg-action-soft/40 px-4 py-3 text-sm text-ink flex items-center gap-2">
        <Icon className="text-action size-4" name="sparkles" />
        <span><strong>Live AI Connected:</strong> Text interpretation uses OpenAI <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono">gpt-5.6-luna</code> in real-time.</span>
      </div>
      <section className="surface-card overflow-hidden">
        <div className="border-b border-border bg-surface-muted/60 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon className="text-action" name="sparkles" />
            Tell Ledger AI what happened
          </div>
        </div>
        <form className="grid gap-5 p-5 sm:p-6" onSubmit={handleSubmit}>
          <textarea
            className="field min-h-35 resize-y"
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
            placeholder="e.g. Spent 5.40 at Starbucks with cash"
            value={text}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Try: “Gaste 3.19 en Starbucks con BAC.”
            </p>
            <button
              className="button-primary"
              disabled={!text.trim() || loading}
              suppressHydrationWarning
              type="submit"
            >
              {loading ? "Parsing with AI…" : "Preview interpretation"}{" "}
              <Icon className="size-4" name="arrow-right" />
            </button>
          </div>
        </form>
      </section>
      {error ? (
        <section className="surface-card border-danger/30 p-5 sm:p-6">
          <div className="flex items-start gap-3 text-danger">
            <Icon className="size-5 shrink-0" name="shield" />
            <div>
              <p className="font-semibold text-ink">Parser Error</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
          </div>
        </section>
      ) : null}

      {success ? (
        <section className="surface-card border-success/40 bg-success-soft/20 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white">
                ✓
              </span>
              <p className="font-semibold text-ink">{success}</p>
            </div>
            <Link className="button-primary text-xs" href="/ledger">
              View in Ledger →
            </Link>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="surface-card border-action/30 p-5 sm:p-6 grid gap-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-action-soft text-action">
              <Icon name="sparkles" />
            </span>
            <div className="w-full">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">
                  Parsed Command Proposal
                </p>
                <span className="rounded-full bg-action-soft px-2.5 py-0.5 text-xs font-semibold text-action">
                  {(result.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted">
                Structured proposal generated by AI. Review parameters below and confirm to save to database.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <Detail label="Amount" value={money(result.data.amount)} />
                <Detail label="Type" value={result.data.type} />
                <Detail label="Category" value={result.data.category} />
                <Detail label="Account" value={result.data.account} />
                {result.data.merchant ? (
                  <Detail label="Merchant" value={result.data.merchant} />
                ) : null}
                <Detail label="Date" value={result.data.occurredAt} />
                <Detail label="Intent" value={result.intent} />
                <Detail label="Currency" value={result.data.currency} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5 grid gap-4">
            <h3 className="text-sm font-semibold text-ink">Confirm & Select Account & Category</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted">
                Account
                <select
                  className="field mt-1"
                  onChange={(e) => setAccountId(e.target.value)}
                  value={accountId}
                >
                  {options?.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-muted">
                Category
                <select
                  className="field mt-1"
                  onChange={(e) => setCategoryId(e.target.value)}
                  value={categoryId}
                >
                  {options?.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                className="button-secondary text-xs"
                onClick={() => setResult(null)}
                type="button"
              >
                Discard proposal
              </button>
              <button
                className="button-primary text-xs"
                disabled={saving || !accountId || !categoryId}
                onClick={handleConfirmSave}
                type="button"
              >
                {saving ? "Saving to Ledger…" : "Save entry to Ledger ✓"}
              </button>
            </div>
          </div>
        </section>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-3">
        <CaptureCard
          icon="ledger"
          title="Manual entry"
          copy="Use the live Ledger form when precision matters."
        />
        <CaptureCard
          icon="sparkles"
          title="Text command"
          copy="Preview the future plain-language workflow."
        />
        <CaptureCard
          icon="shield"
          title="Private capture"
          copy="Media workflows remain unavailable until lifecycle guarantees exist."
        />
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
function CaptureCard({
  icon,
  title,
  copy,
}: {
  icon: "ledger" | "sparkles" | "shield";
  title: string;
  copy: string;
}) {
  return (
    <div className="surface-card p-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-action-soft text-action">
        <Icon className="size-4" name={icon} />
      </span>
      <h2 className="mt-4 font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-muted">{copy}</p>
    </div>
  );
}
