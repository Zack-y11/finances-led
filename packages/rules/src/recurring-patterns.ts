import { merchantKeyFromName } from "./merchant-name.js";

export type RecurringCadence = "weekly" | "biweekly" | "monthly";

export type RecurringLedgerSnapshot = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  merchant: string;
  merchantId: string | null;
  occurredAt: Date;
};

export type RecurringPattern = {
  merchant: string;
  merchantId: string | null;
  type: "income" | "expense";
  cadence: RecurringCadence;
  medianAmount: number;
  occurrenceCount: number;
  lastOccurredAt: string;
  nextExpectedAt: string;
  active: boolean;
  sampleEntryIds: string[];
};

const CADENCE_WINDOWS: Array<{
  cadence: RecurringCadence;
  minDays: number;
  maxDays: number;
  periodDays: number;
}> = [
  { cadence: "weekly", minDays: 5, maxDays: 9, periodDays: 7 },
  { cadence: "biweekly", minDays: 11, maxDays: 17, periodDays: 14 },
  { cadence: "monthly", minDays: 26, maxDays: 35, periodDays: 30 },
];

const MIN_OCCURRENCES = 3;
const AMOUNT_RELATIVE_TOLERANCE = 0.15;
const AMOUNT_ABSOLUTE_TOLERANCE = 2;
const MATCH_RATIO = 0.6;

export function detectRecurringPatterns(
  entries: RecurringLedgerSnapshot[],
): RecurringPattern[] {
  const groups = groupEntries(entries);

  const patterns: RecurringPattern[] = [];

  for (const group of groups) {
    const pattern = detectGroup(group);
    if (pattern) patterns.push(pattern);
  }

  return patterns.sort(
    (left, right) =>
      Number(right.active) - Number(left.active) ||
      right.occurrenceCount - left.occurrenceCount ||
      left.merchant.localeCompare(right.merchant),
  );
}

function detectGroup(
  entries: RecurringLedgerSnapshot[],
): RecurringPattern | null {
  const sorted = [...entries].sort(
    (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
  );
  const occurrences = uniqueByDay(sorted);
  if (occurrences.length < MIN_OCCURRENCES) return null;

  const amounts = occurrences
    .map((entry) => cents(entry.amount))
    .sort((a, b) => a - b);
  const median = medianValue(amounts);
  const similar = occurrences.filter((entry) =>
    amountsAreSimilar(cents(entry.amount), median),
  );
  if (similar.length < MIN_OCCURRENCES) return null;

  const intervals = dayIntervals(similar.map((entry) => entry.occurredAt));
  if (intervals.length === 0) return null;

  const match = bestCadence(intervals);
  if (!match) return null;

  const last = similar[similar.length - 1];
  if (!last) return null;

  const lastDay = utcDayNumber(last.occurredAt);
  const today = utcDayNumber(new Date());
  const grace = Math.ceil(match.periodDays * 1.5) + 3;

  return {
    merchant: last.merchant,
    merchantId: last.merchantId,
    type: last.type === "INCOME" ? "income" : "expense",
    cadence: match.cadence,
    medianAmount: median / 100,
    occurrenceCount: similar.length,
    lastOccurredAt: last.occurredAt.toISOString(),
    nextExpectedAt: nextExpectedDate(last.occurredAt, match).toISOString(),
    active: today - lastDay <= grace,
    sampleEntryIds: similar.slice(-5).map((entry) => entry.id),
  };
}

function uniqueByDay(
  entries: RecurringLedgerSnapshot[],
): RecurringLedgerSnapshot[] {
  const byDay = new Map<number, RecurringLedgerSnapshot>();
  for (const entry of entries) {
    const day = utcDayNumber(entry.occurredAt);
    const current = byDay.get(day);
    if (
      !current ||
      (!current.merchantId && entry.merchantId) ||
      (current.merchantId === entry.merchantId &&
        entry.occurredAt.getTime() > current.occurredAt.getTime())
    ) {
      byDay.set(day, entry);
    }
  }
  return [...byDay.values()];
}

type MerchantGroup = {
  entries: RecurringLedgerSnapshot[];
  lookups: Set<string>;
};

function groupEntries(
  entries: RecurringLedgerSnapshot[],
): RecurringLedgerSnapshot[][] {
  const groups = new Set<MerchantGroup>();
  const groupsByLookup = new Map<string, MerchantGroup>();

  for (const entry of entries) {
    const merchantKey = merchantKeyFromName(entry.merchant);
    if (!merchantKey) continue;

    const lookups = [`key:${entry.type}:${merchantKey}`];
    if (entry.merchantId) {
      lookups.push(`id:${entry.type}:${entry.merchantId}`);
    }

    const matchingGroups = new Set(
      lookups
        .map((lookup) => groupsByLookup.get(lookup))
        .filter((group): group is MerchantGroup => group !== undefined),
    );
    const group = matchingGroups.values().next().value ?? {
      entries: [],
      lookups: new Set<string>(),
    };
    groups.add(group);

    for (const matchingGroup of matchingGroups) {
      if (matchingGroup === group) continue;
      group.entries.push(...matchingGroup.entries);
      for (const lookup of matchingGroup.lookups) {
        groupsByLookup.set(lookup, group);
        group.lookups.add(lookup);
      }
      groups.delete(matchingGroup);
    }

    group.entries.push(entry);
    for (const lookup of lookups) {
      groupsByLookup.set(lookup, group);
      group.lookups.add(lookup);
    }
  }

  return [...groups].map((group) => group.entries);
}

function dayIntervals(dates: Date[]): number[] {
  const intervals: number[] = [];
  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1];
    const current = dates[index];
    if (!previous || !current) continue;
    const days = utcDayNumber(current) - utcDayNumber(previous);
    if (days > 0) intervals.push(days);
  }
  return intervals;
}

function bestCadence(
  intervals: number[],
): (typeof CADENCE_WINDOWS)[number] | null {
  let winner: (typeof CADENCE_WINDOWS)[number] | null = null;
  let winnerCount = 0;

  for (const window of CADENCE_WINDOWS) {
    const count = intervals.filter(
      (days) => days >= window.minDays && days <= window.maxDays,
    ).length;
    if (count > winnerCount) {
      winner = window;
      winnerCount = count;
    }
  }

  if (!winner || winnerCount / intervals.length < MATCH_RATIO) {
    return null;
  }
  return winner;
}

function amountsAreSimilar(amountCents: number, medianCents: number): boolean {
  const delta = Math.abs(amountCents - medianCents);
  const relative = Math.max(
    Math.round(medianCents * AMOUNT_RELATIVE_TOLERANCE),
    Math.round(AMOUNT_ABSOLUTE_TOLERANCE * 100),
  );
  return delta <= relative;
}

function medianValue(sorted: number[]): number {
  const middle = Math.floor(sorted.length / 2);
  const mid = sorted[middle];
  const lower = sorted[middle - 1];
  if (mid === undefined) return 0;
  if (sorted.length % 2 === 1 || lower === undefined) return mid;
  return Math.round((lower + mid) / 2);
}

function cents(amount: number): number {
  return Math.round(amount * 100);
}

function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
}

function utcDateFromDayNumber(dayNumber: number): Date {
  return new Date(dayNumber * 86_400_000);
}

function nextExpectedDate(
  lastOccurredAt: Date,
  cadence: (typeof CADENCE_WINDOWS)[number],
): Date {
  if (cadence.cadence !== "monthly") {
    return utcDateFromDayNumber(
      utcDayNumber(lastOccurredAt) + cadence.periodDays,
    );
  }

  const year = lastOccurredAt.getUTCFullYear();
  const nextMonth = lastOccurredAt.getUTCMonth() + 1;
  const day = lastOccurredAt.getUTCDate();
  const daysInNextMonth = new Date(
    Date.UTC(year, nextMonth + 1, 0),
  ).getUTCDate();

  return new Date(Date.UTC(year, nextMonth, Math.min(day, daysInNextMonth)));
}
