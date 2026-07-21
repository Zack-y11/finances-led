import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { DemoNotice } from "@/components/ui/demo-notice";

export default function SettingsPage() {
  return (
    <div className="grid gap-8">
      <PageHeading
        eyebrow="Settings"
        title="Control your financial workspace."
        description="Profile, privacy, processing preferences, and integrations are displayed as ready-to-connect components."
      />
      <DemoNotice feature="Settings and privacy" />
      <section className="grid gap-6">
        <SettingsCard title="Profile" icon="settings">
          <label>
            Display name
            <input className="field" readOnly defaultValue="Alex Morgan" />
          </label>
          <label>
            Email
            <input
              className="field"
              readOnly
              defaultValue="alex@example.com"
              type="email"
            />
          </label>
        </SettingsCard>
        <SettingsCard title="Data & privacy" icon="shield">
          <Toggle
            title="Keep audit explanations"
            copy="Show why a category, account, or group was suggested."
            enabled
          />
          <Toggle
            title="Privacy-first capture"
            copy="Raw media must be deleted after processing."
            enabled
          />
        </SettingsCard>
        <SettingsCard title="AI processing preferences" icon="sparkles">
          <Toggle
            title="Suggest categories"
            copy="Show proposals before a financial entry is saved."
            enabled
          />
          <Toggle
            title="Apply high-confidence suggestions"
            copy="Disabled until the review policy is defined."
          />
        </SettingsCard>
        <SettingsCard title="Integrations" icon="wallet">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-muted p-4">
            <div>
              <p className="font-semibold text-ink">Bank connection</p>
              <p className="mt-1 text-sm text-muted">
                Available after a future secure integration.
              </p>
            </div>
            <button
              aria-disabled="true"
              className="button-secondary"
              disabled
              type="button"
            >
              Connection unavailable
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              className="text-sm font-semibold text-action hover:underline"
              href="/settings/accounts"
            >
              Manage accounts →
            </Link>
            <Link
              className="text-sm font-semibold text-action hover:underline"
              href="/settings/categories"
            >
              Manage categories →
            </Link>
          </div>
        </SettingsCard>
      </section>
    </div>
  );
}

function SettingsCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: "settings" | "shield" | "sparkles" | "wallet";
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-action-soft text-action">
          <Icon name={icon} />
        </span>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}
function Toggle({
  title,
  copy,
  enabled = false,
}: {
  title: string;
  copy: string;
  enabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-5 text-muted">{copy}</p>
      </div>
      <span
        className={
          enabled
            ? "mt-1 inline-flex h-6 w-11 items-center justify-end rounded-full bg-action p-1"
            : "mt-1 inline-flex h-6 w-11 items-center rounded-full bg-border p-1"
        }
      >
        <span className="size-4 rounded-full bg-white" />
      </span>
    </div>
  );
}
