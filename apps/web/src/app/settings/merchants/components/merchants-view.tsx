/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, cardVariants } from "@/components/ui/card";
import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/ui/page-heading";
import {
  addMerchantAlias,
  createMerchant,
  getCategories,
  getMerchants,
  mergeMerchants,
  updateMerchant,
  type Category,
  type Merchant,
} from "@/lib/api";
import { cn, nativeSelectClassName } from "@/lib/utils";

export function MerchantsView() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [editing, setEditing] = useState<Merchant>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    Promise.all([getMerchants(), getCategories()])
      .then(([nextMerchants, nextCategories]) => {
        if (!active) return;
        setMerchants(nextMerchants);
        setCategories(nextCategories);
      })
      .catch((reason) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load merchants.",
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

  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow="Automation"
        title="Merchants"
        description="Canonical merchant names, aliases, and default categories so receipts and commands need less correction over time."
        action={
          <Button
            className="shrink-0"
            onClick={() => setEditing(undefined)}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            New merchant
          </Button>
        }
      />
      {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      <MerchantForm
        categories={categories}
        merchant={editing}
        merchants={merchants}
        onSaved={saved}
      />
      {loading ? <LoadingCard label="Loading merchants…" /> : null}
      <Card className="overflow-hidden gap-0">
        <div className="border-b border-border p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Merchant directory</h2>
          <p className="mt-1 text-sm text-muted">
            Incoming names like STARBUCKS #1842 match these records after
            deterministic normalization. Add aliases for nicknames the parser
            still misses.
          </p>
        </div>
        <div className="divide-y divide-border">
          {merchants.map((merchant) => (
            <article
              className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-start sm:p-6"
              key={merchant.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">
                    {merchant.displayName}
                  </h3>
                  <Badge className="text-[11px]">
                    {merchant.entryCount}{" "}
                    {merchant.entryCount === 1 ? "entry" : "entries"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Key <code>{merchant.normalizedKey}</code>
                  {merchant.defaultCategory
                    ? ` · default category ${merchant.defaultCategory.name}`
                    : " · no default category"}
                </p>
                {merchant.aliases.length ? (
                  <p className="mt-2 text-sm text-muted">
                    Aliases:{" "}
                    {merchant.aliases.map((alias) => alias.alias).join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted">No extra aliases yet.</p>
                )}
              </div>
              <Button
                className="justify-self-start sm:justify-self-end"
                onClick={() => setEditing(merchant)}
                type="button"
                variant="secondary"
              >
                Edit
              </Button>
            </article>
          ))}
          {!merchants.length && !loading ? (
            <p className="p-5 text-sm text-muted sm:p-6">
              No merchants yet. Save a ledger entry or create one here.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function MerchantForm({
  categories,
  merchant,
  merchants,
  onSaved,
}: {
  categories: Category[];
  merchant?: Merchant;
  merchants: Merchant[];
  onSaved: (message: string) => void;
}) {
  const [displayName, setDisplayName] = useState(merchant?.displayName ?? "");
  const [defaultCategoryId, setDefaultCategoryId] = useState(
    merchant?.defaultCategory?.id ?? "",
  );
  const [alias, setAlias] = useState("");
  const [sourceMerchantId, setSourceMerchantId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setDisplayName(merchant?.displayName ?? "");
    setDefaultCategoryId(merchant?.defaultCategory?.id ?? "");
    setAlias("");
    setSourceMerchantId("");
    setError(undefined);
  }, [merchant]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      if (merchant) {
        await updateMerchant(merchant.id, {
          displayName: displayName.trim(),
          defaultCategoryId: defaultCategoryId || null,
        });
        if (alias.trim()) {
          await addMerchantAlias(merchant.id, alias.trim());
        }
        if (sourceMerchantId) {
          await mergeMerchants(merchant.id, sourceMerchantId);
        }
      } else {
        await createMerchant({
          displayName: displayName.trim(),
          ...(defaultCategoryId ? { defaultCategoryId } : {}),
        });
        setDisplayName("");
        setDefaultCategoryId("");
      }
      onSaved(merchant ? "Merchant updated." : "Merchant created.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save merchant.",
      );
    } finally {
      setSaving(false);
    }
  }

  const mergeCandidates = merchants.filter((item) => item.id !== merchant?.id);

  return (
    <form
      className={cn(cardVariants(), "grid gap-4 p-5 sm:grid-cols-2 sm:p-6")}
      onSubmit={submit}
    >
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-ink">
          {merchant ? "Edit merchant" : "Create merchant"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Display name is canonical. Store numbers and Inc/LLC suffixes are
          stripped automatically when matching incoming text.
        </p>
      </div>
      <label>
        Display name
        <Input
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Starbucks"
          required
          value={displayName}
        />
      </label>
      <label>
        Default category
        <select
          className={nativeSelectClassName}
          onChange={(event) => setDefaultCategoryId(event.target.value)}
          value={defaultCategoryId}
        >
          <option value="">None</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      {merchant ? (
        <>
          <label>
            Add alias
            <Input
              onChange={(event) => setAlias(event.target.value)}
              placeholder="SBUX or AMZN MKTP US"
              value={alias}
            />
          </label>
          <label>
            Merge another merchant into this one
            <select
              className={nativeSelectClassName}
              onChange={(event) => setSourceMerchantId(event.target.value)}
              value={sourceMerchantId}
            >
              <option value="">Do not merge</option>
              {mergeCandidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {error ? (
        <p
          className="text-sm font-medium text-danger sm:col-span-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="flex gap-3 sm:col-span-2">
        <Button disabled={saving} type="submit">
          {saving ? "Saving…" : merchant ? "Save merchant" : "Create merchant"}
        </Button>
      </div>
    </form>
  );
}
