"use client";

import { createLedgerEntrySchema } from "@finance/contracts";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Option = { id: string; name: string };

export function CreateEntryForm({ accounts, categories }: { accounts: Option[]; categories: Option[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const form = event.currentTarget;
    const values = new FormData(form);
    const parsed = createLedgerEntrySchema.safeParse({
      type: values.get("type"),
      amount: Number(values.get("amount")),
      currency: "USD",
      merchant: values.get("merchant"),
      accountId: values.get("accountId"),
      categoryId: values.get("categoryId"),
      occurredAt: new Date(`${values.get("date")}T12:00:00`).toISOString(),
      note: values.get("note") || undefined,
      inputMethod: "manual",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid entry");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/ledger-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("Could not save the entry");
      form.reset();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded border border-zinc-200 p-5">
      <label>Type<select name="type" className="field"><option value="expense">Expense</option><option value="income">Income</option><option value="adjustment">Adjustment</option></select></label>
      <label>Amount<input name="amount" className="field" type="number" min="0.01" step="0.01" placeholder="3.19" required /></label>
      <label>Merchant<input name="merchant" className="field" placeholder="Starbucks" required /></label>
      <label>Account<select name="accountId" className="field" required>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Category<select name="categoryId" className="field" required>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Date<input name="date" className="field" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
      <label>Note<input name="note" className="field" placeholder="Coffee" /></label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50" disabled={saving || !accounts.length || !categories.length}>{saving ? "Saving…" : "Save entry"}</button>
    </form>
  );
}
