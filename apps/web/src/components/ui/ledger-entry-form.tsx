"use client";

import { createLedgerEntrySchema, type CreateLedgerEntry } from "@finance/contracts";
import { FormEvent, useMemo, useState } from "react";

import { appendEntryToGroup, createLedgerEntry, type LedgerOptions } from "@/lib/api";

type EntryType = "income" | "expense" | "adjustment";

export function LedgerEntryForm({
  options,
  groupId,
  defaultType = "expense",
  onSaved,
  onCancel,
}: {
  options: LedgerOptions | null;
  groupId?: string;
  defaultType?: EntryType;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<EntryType>(defaultType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const categories = useMemo(() => options?.categories.filter((category) => {
    const kind = category.kind.toLowerCase();
    return kind === type || kind === "both" || type === "adjustment";
  }) ?? [], [options, type]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const form = event.currentTarget;
    const values = new FormData(form);
    const parsed = createLedgerEntrySchema.safeParse({
      type,
      amount: Number(values.get("amount")),
      currency: "USD",
      merchant: values.get("merchant") || undefined,
      accountId: values.get("accountId"),
      categoryId: values.get("categoryId"),
      occurredAt: new Date(`${values.get("date")}T12:00:00.000Z`).toISOString(),
      note: values.get("note") || undefined,
      inputMethod: "manual",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter valid transaction details.");
      return;
    }

    setSaving(true);
    try {
      const input: CreateLedgerEntry = parsed.data;
      if (groupId) await appendEntryToGroup(groupId, input);
      else await createLedgerEntry(input);
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the entry.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="surface-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" onSubmit={submit}>
    <div className="sm:col-span-2"><h2 className="text-lg font-semibold text-ink">{groupId ? "Add group entry" : "Manual transaction"}</h2><p className="mt-1 text-sm text-muted">This entry will be saved to your ledger.</p></div>
    <label>Type<select className="field" onChange={(event) => setType(event.target.value as EntryType)} value={type}><option value="expense">Expense</option><option value="income">Income</option><option value="adjustment">Adjustment</option></select></label>
    <label>Amount<input className="field" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" /></label>
    <label>Merchant<input className="field" name="merchant" placeholder="Where did it happen?" /></label>
    <label>Date<input className="field" defaultValue={localDateValue()} name="date" required type="date" /></label>
    <label>Account<select className="field" disabled={!options?.accounts.length} name="accountId" required>{options?.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
    <label>Category<select className="field" disabled={!categories.length} key={type} name="categoryId" required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label className="sm:col-span-2">Note<input className="field" name="note" placeholder="Optional detail" /></label>
    {error ? <p className="sm:col-span-2 text-sm font-medium text-danger" role="alert">{error}</p> : null}
    <div className="flex gap-3 sm:col-span-2"><button className="button-primary" disabled={saving || !options?.accounts.length || !categories.length} type="submit">{saving ? "Saving&" : groupId ? "Add entry" : "Save transaction"}</button><button className="button-secondary" disabled={saving} onClick={onCancel} type="button">Cancel</button></div>
  </form>;
}

function localDateValue() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
