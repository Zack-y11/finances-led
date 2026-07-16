import Link from "next/link";

import { AppendGroupEntryForm } from "./components/append-group-entry-form";

type Entry = {
  id: string;
  type: "INCOME" | "EXPENSE" | "ADJUSTMENT";
  amount: string;
  currency: string;
  merchant: string | null;
  occurredAt: string;
  account: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
};

type EntryGroup = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "MIXED";
  description: string | null;
  total: string;
  ledgerEntries: Entry[];
};

type LedgerData = {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: string }[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getGroupData(id: string): Promise<{
  group?: EntryGroup;
  accounts: LedgerData["accounts"];
  categories: LedgerData["categories"];
  error?: string;
}> {
  try {
    const [groupResponse, ledgerResponse] = await Promise.all([
      fetch(`${apiUrl}/entry-groups/${id}`, { cache: "no-store" }),
      fetch(`${apiUrl}/ledger-entries`, { cache: "no-store" }),
    ]);
    if (!groupResponse.ok) throw new Error(`Group API returned ${groupResponse.status}`);
    if (!ledgerResponse.ok) throw new Error(`Ledger API returned ${ledgerResponse.status}`);

    const group = (await groupResponse.json()) as EntryGroup;
    const ledgerData = (await ledgerResponse.json()) as LedgerData;
    if (!Array.isArray(group.ledgerEntries) || !Array.isArray(ledgerData.accounts) || !Array.isArray(ledgerData.categories)) {
      throw new Error("API returned an unexpected group response");
    }
    return { group, accounts: ledgerData.accounts, categories: ledgerData.categories };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Unknown API error";
    return { accounts: [], categories: [], error: message };
  }
}

function defaultEntryType(groupType: EntryGroup["type"] | undefined): "income" | "expense" | "adjustment" {
  if (groupType === "INCOME") return "income";
  return "expense";
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { group, accounts, categories, error } = await getGroupData(id);

  return (
    <main className="mx-auto grid w-full max-w-2xl gap-8 p-6">
      <Link href="/groups" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
        Back to groups
      </Link>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load group: {error}
        </p>
      )}

      {group && (
        <>
          <section className="grid gap-2">
            <h1 className="text-3xl font-semibold">{group.name}</h1>
            {group.description && <p className="text-zinc-600">{group.description}</p>}
            <p className="text-2xl font-semibold">Total: ${Number(group.total).toFixed(2)}</p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Entries</h2>
            <div className="grid gap-3">
              {group.ledgerEntries.map((entry) => {
                const sign = entry.type === "INCOME" ? "+" : "-";
                return (
                  <div key={entry.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-zinc-200 py-2">
                    <span>{entry.merchant ?? "No merchant"}</span>
                    <span className="text-zinc-600">{entry.category?.name ?? "Uncategorized"}</span>
                    <span>
                      {sign}${Number(entry.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
              {!group.ledgerEntries.length && <p className="text-zinc-500">No entries in this group yet.</p>}
            </div>
          </section>

          <AppendGroupEntryForm
            groupId={group.id}
            defaultType={defaultEntryType(group.type)}
            accounts={accounts}
            categories={categories}
          />
        </>
      )}
    </main>
  );
}
