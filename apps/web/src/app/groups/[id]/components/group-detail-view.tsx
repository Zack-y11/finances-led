/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LedgerEntryForm } from "@/components/ui/ledger-entry-form";
import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { TransactionList } from "@/components/ui/transaction-list";
import {
  getEntryGroup,
  getLedgerOptions,
  money,
  type EntryGroupDetail,
  type LedgerOptions,
} from "@/lib/api";

export function GroupDetailView({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<EntryGroupDetail>();
  const [options, setOptions] = useState<LedgerOptions | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    setError(undefined);
    Promise.all([getEntryGroup(groupId), getLedgerOptions()])
      .then(([detail, nextOptions]) => {
        setGroup(detail);
        setOptions(nextOptions);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load this group.",
        ),
      );
  }, [groupId, reload]);

  if (error)
    return (
      <div className="grid gap-4">
        <StatusMessage tone="error">{error}</StatusMessage>
        <Link
          className="inline-flex text-sm font-semibold text-action hover:underline"
          href="/groups"
        >
          Return to groups
        </Link>
      </div>
    );
  if (!group) return <LoadingCard label="Loading group…" />;
  const defaultType = group.type === "mixed" ? "expense" : group.type;
  return (
    <div className="grid gap-8">
      <Link
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-action hover:underline"
        href="/groups"
      >
        ← All groups
      </Link>
      <PageHeading
        eyebrow={group.type + " group"}
        title={group.name}
        description={group.description || "No description yet."}
        action={
          <button
            className="button-primary"
            onClick={() => setShowForm((value) => !value)}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            Add entry
          </button>
        }
      />
      {showForm ? (
        <LedgerEntryForm
          defaultType={defaultType}
          groupId={groupId}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setNotice("Entry added to this group.");
            setReload((value) => value + 1);
          }}
          options={options}
        />
      ) : null}
      {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Group total" value={money(group.total)} />
        <Metric
          label="Linked entries"
          value={String(group.ledgerEntries.length)}
        />
        <Metric label="Group type" value={group.type} />
      </section>
      <section className="surface-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Group activity</h2>
        <p className="mt-1 text-sm text-muted">
          Entries keep their original date, category, and account.
        </p>
        <div className="mt-4">
          <TransactionList items={group.ledgerEntries} />
        </div>
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-2xl font-bold capitalize text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}
