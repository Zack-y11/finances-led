/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { createEntryGroupSchema } from "@finance/contracts";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { createEntryGroup, getEntryGroups, money, type EntryGroup } from "@/lib/api";

export function GroupsView() {
  const [creating, setCreating] = useState(false);
  const [groups, setGroups] = useState<EntryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string>();

  async function load() {
    setLoading(true); setError(undefined);
    try { setGroups(await getEntryGroups()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load groups."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined);
    const values = new FormData(event.currentTarget);
    const parsed = createEntryGroupSchema.safeParse({ name: values.get("name"), type: values.get("type"), description: values.get("description") || undefined });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Enter valid group details."); return; }
    setSaving(true);
    try { await createEntryGroup(parsed.data); setCreating(false); setNotice("Group created. You can now add ledger entries to it."); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the group."); } finally { setSaving(false); }
  }

  const total = groups.reduce((sum, group) => sum + group.total, 0);
  return <div className="grid gap-8">
    <PageHeading eyebrow="Entry groups" title="Keep related spending together." description="Groups make a larger event traceable without rewriting its individual ledger entries." action={<button className="button-primary" onClick={() => setCreating((value) => !value)} type="button"><Icon className="size-4" name="plus" />New group</button>} />
    {creating ? <form className="surface-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" onSubmit={submit}><div className="sm:col-span-2"><h2 className="text-lg font-semibold text-ink">Create an entry group</h2><p className="mt-1 text-sm text-muted">Groups are saved immediately and can receive ledger entries.</p></div><label>Name<input className="field" name="name" placeholder="e.g. August trip" required /></label><label>Group type<select className="field" defaultValue="expense" name="type"><option value="expense">Expense</option><option value="income">Income</option><option value="mixed">Mixed</option></select></label><label className="sm:col-span-2">Description<input className="field" name="description" placeholder="What belongs in this group?" /></label><div className="flex gap-3 sm:col-span-2"><button className="button-primary" disabled={saving} type="submit">{saving ? "Creating…" : "Create group"}</button><button className="button-secondary" disabled={saving} onClick={() => setCreating(false)} type="button">Cancel</button></div></form> : null}
    {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
    {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Active groups" value={String(groups.length)} /><Metric label="Grouped total" value={money(total)} /><Metric label="Data source" value="Live API" /></section>
    {loading ? <p className="text-sm text-muted">Loading groups…</p> : groups.length ? <section className="grid gap-4 md:grid-cols-3">{groups.map((group) => <Link key={group.id} className="surface-card group p-5 transition-transform hover:-translate-y-0.5" href={"/groups/" + group.id}><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-action-soft px-2.5 py-1 text-xs font-semibold text-action">{group.type}</span><Icon className="size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-action" name="arrow-right" /></div><h2 className="mt-5 text-lg font-semibold text-ink">{group.name}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-muted">{group.description || "No description yet."}</p><div className="mt-6 flex items-end justify-between border-t border-border pt-4"><span className="text-xs text-muted">View group activity</span><span className="text-lg font-bold text-ink tabular-nums">{money(group.total)}</span></div></Link>)}</section> : <div className="surface-card p-6 text-sm text-muted">No groups yet. Create one to collect related ledger entries.</div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="surface-card p-5"><p className="text-sm font-medium text-muted">{label}</p><p className="mt-3 text-2xl font-bold text-ink tabular-nums">{value}</p></div>; }