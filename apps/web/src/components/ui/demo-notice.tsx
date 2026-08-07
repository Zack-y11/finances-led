import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MessageTone = "error" | "success" | "neutral";

export function DemoNotice({ feature }: { feature: string }) {
  return (
    <StatusMessage tone="neutral">
      <strong className="text-ink">Demo data.</strong> {feature} is displayed
      for design review; its API is not available yet.
    </StatusMessage>
  );
}

export function StatusMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: MessageTone;
}) {
  const variant =
    tone === "error" ? "destructive" : tone === "success" ? "success" : "default";
  return (
    <Alert variant={variant} role={tone === "error" ? "alert" : "status"}>
      <AlertDescription className="text-sm font-medium text-inherit">
        {children}
      </AlertDescription>
    </Alert>
  );
}

export function LoadingCard({ label = "Loading…" }: { label?: string }) {
  return (
    <Card aria-busy="true" className="p-6">
      <Skeleton className="h-4 w-32" />
      <p className="mt-4 text-sm text-muted">{label}</p>
    </Card>
  );
}
