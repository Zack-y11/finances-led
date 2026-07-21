/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { createCategorySchema, updateCategorySchema } from "@finance/contracts";
import { FormEvent, useEffect, useState } from "react";

import { LoadingCard, StatusMessage } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import {
  createCategory,
  getCategories,
  updateCategory,
  type Category,
} from "@/lib/api";

type CategoryKind = Category["kind"];

const categoryKindLabels: Record<CategoryKind, string> = {
  income: "Income",
  expense: "Expense",
  both: "Both",
};

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [editing, setEditing] = useState<Category>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    getCategories()
      .then((nextCategories) => {
        if (active) setCategories(nextCategories);
      })
      .catch((reason) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load categories.",
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
    <div className="grid gap-8">
      <PageHeading
        eyebrow="Settings"
        title="Categories"
        description="Create and edit the income and expense categories used by ledger entries."
        action={
          <button
            className="button-primary shrink-0"
            onClick={() => setEditing(undefined)}
            type="button"
          >
            <Icon className="size-4" name="plus" />
            New category
          </button>
        }
      />
      {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      <CategoryForm category={editing} onSaved={saved} />
      {loading ? <LoadingCard label="Loading categories…" /> : null}
      <section className="surface-card overflow-hidden">
        <div className="border-b border-border p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Category list</h2>
          <p className="mt-1 text-sm text-muted">
            Categories are editable; deletion is intentionally unavailable for
            ledger history.
          </p>
        </div>
        <div className="divide-y divide-border">
          {categories.map((category) => (
            <article
              className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
              key={category.id}
            >
              <div>
                <h3 className="font-semibold text-ink">{category.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {categoryKindLabels[category.kind]}
                </p>
              </div>
              <button
                className="button-secondary justify-self-start sm:justify-self-end"
                onClick={() => setEditing(category)}
                type="button"
              >
                Edit
              </button>
            </article>
          ))}
          {!categories.length && !loading ? (
            <p className="p-5 text-sm text-muted sm:p-6">No categories yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CategoryForm({
  category,
  onSaved,
}: {
  category?: Category;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "expense");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setName(category?.name ?? "");
    setKind(category?.kind ?? "expense");
    setError(undefined);
  }, [category]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const input = { name, kind };
    setSaving(true);
    try {
      if (category) {
        const parsed = updateCategorySchema.safeParse(input);
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ?? "Enter valid category details.",
          );
          setSaving(false);
          return;
        }
        await updateCategory(category.id, parsed.data);
      } else {
        const parsed = createCategorySchema.safeParse(input);
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ?? "Enter valid category details.",
          );
          setSaving(false);
          return;
        }
        await createCategory(parsed.data);
        setName("");
        setKind("expense");
      }
      onSaved(category ? "Category updated." : "Category created.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save category.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="surface-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
      onSubmit={submit}
    >
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-ink">
          {category ? "Edit category" : "Create category"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          A Both category is available for income and expense ledger entries.
        </p>
      </div>
      <label>
        Name
        <input
          className="field"
          onChange={(event) => setName(event.target.value)}
          placeholder="Groceries"
          required
          value={name}
        />
      </label>
      <label>
        Kind
        <select
          className="field"
          onChange={(event) => setKind(event.target.value as CategoryKind)}
          value={kind}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="both">Both</option>
        </select>
      </label>
      {error ? (
        <p
          className="text-sm font-medium text-danger sm:col-span-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="flex gap-3 sm:col-span-2">
        <button className="button-primary" disabled={saving} type="submit">
          {saving ? "Saving…" : category ? "Save category" : "Create category"}
        </button>
      </div>
    </form>
  );
}
