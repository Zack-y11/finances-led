/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { createAccountSchema, updateAccountSchema } from "@finance/contracts";
import { FormEvent, useEffect, useState } from "react";

import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import {
  createAccount,
  getAccounts,
  updateAccount,
  type Account,
} from "@/lib/api";

type AccountType = Account["type"];

const accountTypeLabels: Record<AccountType, string> = {
  bank: "Bank",
  cash: "Cash",
  wallet: "Wallet",
  credit_card: "Credit card",
};

export function AccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [editing, setEditing] = useState<Account>();
  const [busyId, setBusyId] = useState<string>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    getAccounts()
      .then((nextAccounts) => {
        if (active) setAccounts(nextAccounts);
      })
      .catch((reason) => {
        if (!active) return;
        setError(
          reason instanceof Error ? reason.message : "Could not load accounts.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  function saved(message: string) {
    setNotice(message);
    setEditing(undefined);
    setReload((value) => value + 1);
  }

  async function toggleAccount(account: Account) {
    setBusyId(account.id);
    setError(undefined);
    setNotice(undefined);
    try {
      await updateAccount(account.id, { isActive: !account.isActive });
      saved(account.isActive ? "Account deactivated." : "Account reactivated.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not update account.",
      );
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeading
        eyebrow="Settings"
        title="Accounts"
        description="Create accounts, edit labels, and deactivate accounts that should no longer accept new ledger entries."
        action={
          <button
            className="button-primary shrink-0"
            onClick={() => setEditing(undefined)}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            New account
          </button>
        }
      />
      {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      <AccountForm account={editing} onSaved={saved} />
      {loading ? <LoadingCard label="Loading accounts…" /> : null}
      <section className="surface-card overflow-hidden">
        <div className="border-b border-border p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Account list</h2>
          <p className="mt-1 text-sm text-muted">
            Inactive accounts remain visible here for historical ledger context.
          </p>
        </div>
        <div className="divide-y divide-border">
          {accounts.map((account) => (
            <article
              className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
              key={account.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{account.name}</h3>
                  <span
                    className={
                      account.isActive
                        ? "rounded-full bg-success-soft px-2 py-1 text-xs font-semibold text-success"
                        : "rounded-full bg-surface-muted px-2 py-1 text-xs font-semibold text-muted"
                    }
                  >
                    {account.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {accountTypeLabels[account.type]} · {account.currency}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="button-secondary"
                  disabled={busyId === account.id}
                  onClick={() => setEditing(account)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="button-secondary"
                  disabled={busyId === account.id}
                  onClick={() => toggleAccount(account)}
                  type="button"
                >
                  {account.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </article>
          ))}
          {!accounts.length && !loading ? (
            <p className="p-5 text-sm text-muted sm:p-6">No accounts yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function AccountForm({
  account,
  onSaved,
}: {
  account?: Account;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "bank");
  const [currency, setCurrency] = useState(account?.currency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setName(account?.name ?? "");
    setType(account?.type ?? "bank");
    setCurrency(account?.currency ?? "USD");
    setError(undefined);
  }, [account]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const input = {
      name,
      type,
      currency: currency.trim().toUpperCase(),
    };
    setSaving(true);
    try {
      if (account) {
        const parsed = updateAccountSchema.safeParse(input);
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ?? "Enter valid account details.",
          );
          setSaving(false);
          return;
        }
        await updateAccount(account.id, parsed.data);
      } else {
        const parsed = createAccountSchema.safeParse(input);
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ?? "Enter valid account details.",
          );
          setSaving(false);
          return;
        }
        await createAccount(parsed.data);
        setName("");
        setType("bank");
        setCurrency("USD");
      }
      onSaved(account ? "Account updated." : "Account created.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save account.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="surface-card grid gap-4 p-5 sm:grid-cols-3 sm:p-6"
      onSubmit={submit}
    >
      <div className="sm:col-span-3">
        <h2 className="text-lg font-semibold text-ink">
          {account ? "Edit account" : "Create account"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Currency uses a three-letter uppercase code.
        </p>
      </div>
      <label>
        Name
        <input
          className="field"
          onChange={(event) => setName(event.target.value)}
          placeholder="Seed Wallet"
          required
          value={name}
        />
      </label>
      <label>
        Type
        <select
          className="field"
          onChange={(event) => setType(event.target.value as AccountType)}
          value={type}
        >
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
          <option value="wallet">Wallet</option>
          <option value="credit_card">Credit card</option>
        </select>
      </label>
      <label>
        Currency
        <input
          className="field uppercase"
          maxLength={3}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          required
          value={currency}
        />
      </label>
      {error ? (
        <p
          className="text-sm font-medium text-danger sm:col-span-3"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="flex gap-3 sm:col-span-3">
        <button className="button-primary" disabled={saving} type="submit">
          {saving ? "Saving…" : account ? "Save account" : "Create account"}
        </button>
      </div>
    </form>
  );
}
