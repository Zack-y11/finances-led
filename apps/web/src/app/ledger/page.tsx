import { Suspense } from "react";

import { LedgerView } from "./components/ledger-view";

export default function LedgerPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading ledger…</p>}>
      <LedgerView />
    </Suspense>
  );
}
