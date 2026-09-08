"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { dateLabel, money, type RecurringPattern } from "@/lib/api";

export function RecurringPatternsCard({
  patterns,
}: {
  patterns: RecurringPattern[];
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Recurring transactions
          </h2>
          <p className="mt-1 text-sm text-muted">
            Detected from posted history using normalized merchant names. The
            backend never auto-posts future entries.
          </p>
        </div>
        <Link
          className="hidden text-sm font-semibold text-action hover:underline sm:block"
          href="/settings/merchants"
        >
          Merchant directory
        </Link>
      </div>
      {patterns.length ? (
        <div className="mt-4 divide-y divide-border">
          {patterns.map((pattern) => (
            <article
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              key={`${pattern.merchant}-${pattern.type}-${pattern.cadence}`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{pattern.merchant}</h3>
                  <Badge className="text-[11px]">{pattern.cadence}</Badge>
                  <Badge className="text-[11px]">
                    {pattern.active ? "Active" : "Quiet"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  About {money(pattern.medianAmount)} · {pattern.occurrenceCount}{" "}
                  times · next {dateLabel(pattern.nextExpectedAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          No weekly, biweekly, or monthly repeats yet. A merchant needs at least
          three similar posted amounts.
        </p>
      )}
    </Card>
  );
}
