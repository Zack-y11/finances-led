import type { ReactNode } from "react";

type MessageTone = "error" | "success" | "neutral";

export function DemoNotice({ feature }: { feature: string }) {
  return <StatusMessage tone="neutral"><strong className="text-ink">Demo data.</strong> {feature} is displayed for design review; its API is not available yet.</StatusMessage>;
}

export function StatusMessage({ children, tone = "neutral" }: { children: ReactNode; tone?: MessageTone }) {
  const styles = tone === "error" ? "border-danger/20 bg-danger-soft text-danger" : tone === "success" ? "border-success/20 bg-success-soft text-success" : "border-action/20 bg-action-soft/50 text-muted";
  return <p className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles}`} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}

export function LoadingCard({ label = "Loading…" }: { label?: string }) {
  return <div aria-busy="true" className="surface-card animate-pulse p-6"><div className="h-4 w-32 rounded bg-surface-muted" /><p className="mt-4 text-sm text-muted">{label}</p></div>;
}