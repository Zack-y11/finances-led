"use client";

import { appendEntryToGroupSchema } from "@finance/contracts";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/lib/utils";

type Option = { id: string; name: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function AppendGroupEntryForm({
  groupId,
  defaultType,
  accounts,
  categories,
}: {
  groupId: string;
  defaultType: "income" | "expense" | "adjustment";
  accounts: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const form = event.currentTarget;
    const values = new FormData(form);
    const parsed = appendEntryToGroupSchema.safeParse({
      type: values.get("type"),
      amount: Number(values.get("amount")),
      currency: "USD",
      merchant: values.get("merchant") || undefined,
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
      const response = await fetch(`${apiUrl}/entry-groups/${groupId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("Could not append the entry");
      form.reset();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not append the entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded border border-zinc-200 p-5">
      <h2 className="text-xl font-semibold">Add entry</h2>
      <label>
        Type
        <select name="type" className={nativeSelectClassName} defaultValue={defaultType}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </label>
      <label>
        Amount
        <Input name="amount" type="number" min="0.01" step="0.01" placeholder="5.00" required />
      </label>
      <label>
        Merchant
        <Input name="merchant" placeholder="Bus" />
      </label>
      <label>
        Account
        <select name="accountId" className={nativeSelectClassName} required>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Category
        <select name="categoryId" className={nativeSelectClassName} required>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Date
        <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </label>
      <label>
        Note
        <Input name="note" placeholder="Optional note" />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button
        disabled={saving || !accounts.length || !categories.length}
      >
        {saving ? "Saving..." : "Add entry"}
      </Button>
    </form>
  );
}
