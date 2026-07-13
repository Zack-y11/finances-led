import { CreateEntryForm } from "./components/create-entry-form";

type Entry = {
  id: string;
  type: "INCOME" | "EXPENSE" | "ADJUSTMENT";
  amount: string;
  currency: string;
  merchant: string | null;
  account: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
};
type LedgerData = {
  entries: Entry[];
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: string }[];
  error?: string;
};

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

async function getLedgerData(): Promise<LedgerData> {
  try {
    const response = await fetch(`${apiUrl}/ledger-entries`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const data = (await response.json()) as LedgerData;
    if (!Array.isArray(data.entries) || !Array.isArray(data.accounts) || !Array.isArray(data.categories)) {
      throw new Error("API returned an unexpected ledger response");
    }
    return data;
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Unknown API error";
    return { entries: [], accounts: [], categories: [], error: message };
  }
}

export default async function LedgerPage() {
  const { entries, accounts, categories, error } = await getLedgerData();

  return (
    <main className="mx-auto grid w-full max-w-xl gap-8 p-6">
      <h1 className="text-3xl font-semibold">Ledger</h1>
      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load ledger data: {error}
        </p>
      )}
      <CreateEntryForm accounts={accounts} categories={categories} />
      <section>
        <h2 className="mb-4 text-xl font-semibold">Recent entries</h2>
        <div className="grid gap-3">
          {entries.map((entry) => {
            const sign = entry.type === "INCOME" ? "+" : "-";
            return <div key={entry.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-zinc-200 py-2"><span>{entry.merchant ?? "—"}</span><span className="text-zinc-600">{entry.category?.name ?? "Uncategorized"}</span><span>{sign}${Number(entry.amount).toFixed(2)}</span></div>;
          })}
          {!entries.length && <p className="text-zinc-500">No entries yet, or the API is unavailable.</p>}
        </div>
      </section>
    </main>
  );
}
