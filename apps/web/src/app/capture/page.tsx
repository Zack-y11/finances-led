"use client";

import { useState } from "react";

import { DemoNotice } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";

export default function CapturePage() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return <div className="mx-auto grid max-w-[1000px] gap-8">
    <PageHeading eyebrow="Quick capture" title="Capture it while it is fresh." description="Type a natural financial note. This interface is ready for a parser and review workflow when those services are connected." />
    <DemoNotice feature="Text interpretation" />
    <section className="surface-card overflow-hidden"><div className="border-b border-border bg-surface-muted/60 px-5 py-4 sm:px-6"><div className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon className="text-action" name="sparkles" />Tell Ledger AI what happened</div></div><form className="grid gap-5 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><textarea className="field min-h-35 resize-y" onChange={(event) => { setText(event.target.value); setSubmitted(false); }} placeholder="e.g. Spent 5.40 at Starbucks with cash" value={text} /><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted">Try: “Gaste 3.19 en Starbucks con BAC.”</p><button className="button-primary" disabled={!text.trim()} type="submit">Preview interpretation <Icon className="size-4" name="arrow-right" /></button></div></form></section>
    {submitted ? <section className="surface-card border-action/30 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-action-soft text-action"><Icon name="sparkles" /></span><div><p className="font-semibold text-ink">Static proposal preview</p><p className="mt-1 text-sm leading-6 text-muted">This is a visual example only. A parser and review API must exist before it can create a ledger entry.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><Detail label="Amount" value="$5.40" /><Detail label="Category" value="Dining" /><Detail label="Account" value="Cash" /></div></div></div></section> : null}
    <section className="grid gap-4 sm:grid-cols-3"><CaptureCard icon="ledger" title="Manual entry" copy="Use the live Ledger form when precision matters." /><CaptureCard icon="sparkles" title="Text command" copy="Preview the future plain-language workflow." /><CaptureCard icon="shield" title="Private capture" copy="Media workflows remain unavailable until lifecycle guarantees exist." /></section>
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-surface-muted px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-sm font-semibold text-ink">{value}</p></div>; }
function CaptureCard({ icon, title, copy }: { icon: "ledger" | "sparkles" | "shield"; title: string; copy: string }) { return <div className="surface-card p-5"><span className="flex size-9 items-center justify-center rounded-lg bg-action-soft text-action"><Icon className="size-4" name={icon} /></span><h2 className="mt-4 font-semibold text-ink">{title}</h2><p className="mt-1 text-sm leading-5 text-muted">{copy}</p></div>; }