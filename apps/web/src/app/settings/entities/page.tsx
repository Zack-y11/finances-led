import Link from "next/link";

import { DemoNotice } from "@/components/ui/demo-notice";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { categories, money } from "@/lib/fixtures";

const accountCards = [
  {
    name: "BAC Checking",
    type: "Bank account",
    balance: 2630.46,
    change: "+12.4%",
  },
  { name: "Cash", type: "Wallet", balance: 84.2, change: "−3.1%" },
  { name: "Credit card", type: "Credit", balance: -218.56, change: "Current" },
];
const categorySpend = [
  { name: "Groceries", amount: 242.8, usage: 76 },
  { name: "Dining", amount: 96.4, usage: 43 },
  { name: "Transport", amount: 139.55, usage: 59 },
];

type EntityTab = "accounts" | "categories";

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const parameters = await searchParams;
  const tab: EntityTab =
    parameters.tab === "categories" ? "categories" : "accounts";
  const isAccounts = tab === "accounts";
  return (
    <div className="grid gap-8">
      <PageHeading
        eyebrow="Accounts & categories"
        title={isAccounts ? "Manage accounts." : "Manage categories."}
        description={
          isAccounts
            ? "Accounts keep money movements grounded and traceable."
            : "Categories keep financial activity understandable and consistent."
        }
        action={
          <button
            aria-disabled="true"
            className="button-primary"
            disabled
            type="button"
          >
            <Icon className="size-4" name="plus" />
            Add {isAccounts ? "account" : "category"} unavailable
          </button>
        }
      />
      <DemoNotice
        feature={isAccounts ? "Account management" : "Category management"}
      />
      <nav
        aria-label="Entity views"
        className="flex w-fit rounded-xl border border-border bg-surface-muted p-1"
      >
        <EntityTab
          href="/settings/entities?tab=accounts"
          label="Accounts"
          active={isAccounts}
        />
        <EntityTab
          href="/settings/entities?tab=categories"
          label="Categories"
          active={!isAccounts}
        />
      </nav>
      {isAccounts ? <AccountsView /> : <CategoriesView />}
    </div>
  );
}

function EntityTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-sm"
          : "rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:text-ink"
      }
      href={href}
    >
      {label}
    </Link>
  );
}
function AccountsView() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Active accounts</h2>
          <p className="mt-1 text-sm text-muted">
            Balances shown as fixture data for the component preview.
          </p>
        </div>
        <button
          aria-disabled="true"
          className="text-sm font-semibold text-muted"
          disabled
          type="button"
        >
          Manage unavailable
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {accountCards.map((account) => (
          <article className="surface-card p-5" key={account.name}>
            <div className="flex items-start justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-action-soft text-action">
                <Icon name="wallet" />
              </span>
              <span className="rounded-full bg-success-soft px-2 py-1 text-xs font-semibold text-success">
                Active
              </span>
            </div>
            <p className="mt-5 font-semibold text-ink">{account.name}</p>
            <p className="mt-1 text-sm text-muted">{account.type}</p>
            <p
              className={
                account.balance < 0
                  ? "mt-5 text-2xl font-bold text-danger tabular-nums"
                  : "mt-5 text-2xl font-bold text-ink tabular-nums"
              }
            >
              {money(account.balance)}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted">
              {account.change} this month
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
function CategoriesView() {
  return (
    <section className="grid gap-6 lg:grid-cols-5">
      <div className="surface-card p-5 sm:p-6 lg:col-span-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Category allocation
            </h2>
            <p className="mt-1 text-sm text-muted">
              Monthly expense distribution.
            </p>
          </div>
          <Icon className="text-action" name="ledger" />
        </div>
        <div className="mt-6 grid gap-5">
          {categorySpend.map((category) => (
            <div key={category.name}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-ink">{category.name}</span>
                <span className="font-semibold text-ink tabular-nums">
                  {money(category.amount)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-action"
                  style={{ width: category.usage + "%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface-card p-5 sm:p-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Categories</h2>
            <p className="mt-1 text-sm text-muted">
              Available classification options.
            </p>
          </div>
          <button
            aria-disabled="true"
            className="text-sm font-semibold text-muted"
            disabled
            type="button"
          >
            Manage unavailable
          </button>
        </div>
        <div className="mt-5 divide-y divide-border">
          {categories.map((category) => (
            <div
              className="flex items-center justify-between py-3"
              key={category}
            >
              <span className="text-sm font-medium text-ink">{category}</span>
              <span className="rounded-full bg-action-soft px-2 py-1 text-xs font-semibold text-action">
                Expense
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
