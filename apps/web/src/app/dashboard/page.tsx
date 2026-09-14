import { Suspense } from "react";

import { DashboardView } from "./components/dashboard-view";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted">Loading dashboard…</p>}
    >
      <DashboardView />
    </Suspense>
  );
}
