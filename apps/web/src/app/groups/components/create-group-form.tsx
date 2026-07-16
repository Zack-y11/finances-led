"use client";

import { createEntryGroupSchema } from "@finance/contracts";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function CreateGroupForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const form = event.currentTarget;
    const values = new FormData(form);
    const parsed = createEntryGroupSchema.safeParse({
      name: values.get("name"),
      type: values.get("type"),
      description: values.get("description") || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid group");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/entry-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("Could not save the group");
      form.reset();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded border border-zinc-200 p-5">
      <h2 className="text-xl font-semibold">New group</h2>
      <label>
        Name
        <input name="name" className="field" placeholder="Hackathon expenses" required />
      </label>
      <label>
        Type
        <select name="type" className="field" defaultValue="expense">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="mixed">Mixed</option>
        </select>
      </label>
      <label>
        Description
        <input name="description" className="field" placeholder="Expenses related to the event" />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50" disabled={saving}>
        {saving ? "Saving..." : "Create group"}
      </button>
    </form>
  );
}
