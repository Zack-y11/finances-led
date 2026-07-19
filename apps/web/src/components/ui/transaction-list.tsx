import { Icon } from "@/components/ui/icon";
import type { LedgerEntry } from "@/lib/api";
import { dateLabel, money } from "@/lib/api";

export function TransactionList({
  items,
  compact = false,
}: {
  items: LedgerEntry[];
  compact?: boolean;
}) {
  if (!items.length)
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-muted/60 p-6 text-sm text-muted">
        No matching entries yet.
      </div>
    );
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <article
          key={item.id}
          className="flex items-center gap-3 py-3.5 sm:gap-4"
        >
          <span
            className={
              item.type === "income"
                ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success"
                : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger"
            }
          >
            <Icon
              className="size-4"
              name={item.type === "income" ? "trend-up" : "trend-down"}
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-ink">
                {item.merchant}
              </p>
            </div>
            <p className="mt-1 truncate text-xs text-muted">
              {item.category.name} · {item.account.name}
              {item.group ? " · " + item.group.name : ""}
            </p>
          </div>
          {!compact ? (
            <p className="hidden text-xs text-muted sm:block">
              {dateLabel(item.occurredAt)}
            </p>
          ) : null}
          <p
            className={
              item.type === "income"
                ? "shrink-0 text-sm font-bold text-success tabular-nums"
                : "shrink-0 text-sm font-bold text-ink tabular-nums"
            }
          >
            {item.type === "income" ? "+" : "−"}
            {money(item.amount)}
          </p>
        </article>
      ))}
    </div>
  );
}
