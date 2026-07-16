import Link from "next/link";

import { CreateGroupForm } from "./components/create-group-form";

type EntryGroup = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "MIXED";
  description: string | null;
  total: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getGroups(): Promise<{ groups: EntryGroup[]; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/entry-groups`, { cache: "no-store" });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const groups = (await response.json()) as EntryGroup[];
    if (!Array.isArray(groups)) throw new Error("API returned an unexpected groups response");
    return { groups };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Unknown API error";
    return { groups: [], error: message };
  }
}

export default async function GroupsPage() {
  const { groups, error } = await getGroups();

  return (
    <main className="mx-auto grid w-full max-w-2xl gap-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Groups</h1>
        <Link href="/ledger" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
          Ledger
        </Link>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load groups: {error}
        </p>
      )}

      <CreateGroupForm />

      <section>
        <h2 className="mb-4 text-xl font-semibold">Entry groups</h2>
        <div className="grid gap-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="grid grid-cols-[1fr_auto] gap-3 border-b border-zinc-200 py-3 hover:bg-zinc-50"
            >
              <span>
                <span className="block font-medium">{group.name}</span>
                <span className="text-sm text-zinc-500">{group.description ?? group.type.toLowerCase()}</span>
              </span>
              <span className="font-semibold">${Number(group.total).toFixed(2)}</span>
            </Link>
          ))}
          {!groups.length && <p className="text-zinc-500">No groups yet.</p>}
        </div>
      </section>
    </main>
  );
}
