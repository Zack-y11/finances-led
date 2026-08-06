"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { DemoNotice } from "@/components/ui/demo-notice";

const rules = [
  {
    condition: "Merchant equals Starbucks",
    action: "Set category to Dining",
    priority: 1,
    runs: 243,
    enabled: true,
  },
  {
    condition: "Amount less than $5.00",
    action: "Set group to Petty cash",
    priority: 2,
    runs: 86,
    enabled: true,
  },
  {
    condition: "Merchant equals Uber",
    action: "Set category to Transport",
    priority: 3,
    runs: 18,
    enabled: false,
  },
];

export default function RulesPage() {
  const [builderOpen, setBuilderOpen] = useState(false);
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="Automation"
        title="Automation rules"
        description="Explicit values always override automation. Rules are applied in priority order and remain explainable."
        action={
          <button
            className="button-primary"
            onClick={() => setBuilderOpen(!builderOpen)}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            Preview rule builder
          </button>
        }
      />
      <DemoNotice feature="Rules" />
      <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <strong className="text-ink">Processing order</strong>
        <p className="mt-1 leading-6">
          Automation can suggest an account, category, or group; it must never
          hide a direct user choice.
        </p>
      </section>
      {builderOpen ? (
        <section className="surface-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-semibold text-ink">
              Create automation rule
            </h2>
            <p className="mt-1 text-sm text-muted">
              This builder is a static preview until rules CRUD is available.
            </p>
          </div>
          <label>
            When
            <select className="field">
              <option>Merchant equals</option>
              <option>Amount less than</option>
              <option>Text contains</option>
            </select>
          </label>
          <label>
            Value
            <input className="field" placeholder="e.g. Starbucks" />
          </label>
          <label>
            Then
            <select className="field">
              <option>Set category</option>
              <option>Set account</option>
              <option>Set group</option>
            </select>
          </label>
          <label>
            To
            <select className="field">
              <option>Dining</option>
              <option>Transport</option>
              <option>Groceries</option>
            </select>
          </label>
          <label>
            Priority
            <input className="field" defaultValue="1" min="1" type="number" />
          </label>
          <div className="flex items-end gap-3">
            <button
              className="button-primary"
              onClick={() => setBuilderOpen(false)}
              type="button"
            >
              Close preview
            </button>
            <button
              className="button-secondary"
              onClick={() => setBuilderOpen(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}
      <section className="surface-card overflow-hidden">
        <div className="grid gap-3 p-4 md:hidden">
          {rules.map((rule) => (
            <article
              className="rounded-xl border border-border bg-surface p-4"
              key={rule.condition}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Rule {rule.priority}
                </span>
                <span
                  className={
                    rule.enabled
                      ? "rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-[#047857]"
                      : "rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted"
                  }
                >
                  {rule.enabled ? "Active" : "Paused"}
                </span>
              </div>
              <h2 className="mt-3 font-semibold text-ink">{rule.action}</h2>
              <div className="mt-4 rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Condition
                </p>
                <p className="mt-1 text-sm text-ink">{rule.condition}</p>
              </div>
              <p className="mt-3 text-xs text-muted">
                Applied {rule.runs} times
              </p>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Rule condition</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Times applied
                </th>
                <th className="px-5 py-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr className="border-t border-border" key={rule.condition}>
                  <td className="px-5 py-4 font-medium text-ink">
                    {rule.condition}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-action-soft px-2.5 py-1 text-xs font-semibold text-action">
                      {rule.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-ink">{rule.priority}</td>
                  <td className="px-5 py-4 text-right text-muted">
                    {rule.runs}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={
                        rule.enabled
                          ? "rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success"
                          : "rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted"
                      }
                    >
                      {rule.enabled ? "Enabled" : "Paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
