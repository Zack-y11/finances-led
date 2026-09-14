import { merchantKeyFromName } from '@finance/rules';
import type { RecurringCadence, RecurringPattern } from '@finance/rules';
import type { MonthlyClosePrediction } from '@finance/contracts';

export type PredictionLedgerEntry = {
  type: 'INCOME' | 'EXPENSE';
  amountCents: number;
  merchant: string | null;
  merchantId: string | null;
  occurredAt: Date;
};

export type MonthlyClosePredictionInput = {
  month: string;
  asOf: Date;
  entries: PredictionLedgerEntry[];
  recurringPatterns?: RecurringPattern[];
};

type RecurringDue = {
  merchant: string;
  type: 'income' | 'expense';
  cadence: RecurringCadence;
  amount: number;
  expectedDate: string;
};

type MonthWindow = {
  startDay: number;
  endDay: number;
  daysInMonth: number;
};

const DAY_MS = 86_400_000;

export function projectMonthlyClose(
  input: MonthlyClosePredictionInput,
): MonthlyClosePrediction {
  const window = monthWindow(input.month);
  const requestedAsOfDay = utcDayNumber(input.asOf);
  const asOfDay = clamp(requestedAsOfDay, window.startDay, window.endDay);
  const elapsedDays = Math.max(0, asOfDay - window.startDay + 1);
  const remainingDays = window.daysInMonth - elapsedDays;

  const entries = input.entries.filter((entry) => {
    const day = utcDayNumber(entry.occurredAt);
    return day >= window.startDay && day <= asOfDay;
  });
  const actualIncomeCents = sumType(entries, 'INCOME');
  const actualExpenseCents = sumType(entries, 'EXPENSE');
  const recurringPatterns = input.recurringPatterns ?? [];
  const variableExpenseCents = entries
    .filter(
      (entry) =>
        entry.type === 'EXPENSE' &&
        !matchesRecurringPattern(entry, recurringPatterns),
    )
    .reduce((total, entry) => total + Math.max(0, entry.amountCents), 0);
  const averageDailySpendCents = elapsedDays
    ? Math.round(variableExpenseCents / elapsedDays)
    : 0;
  const projectedVariableSpendCents = averageDailySpendCents * remainingDays;
  const recurringStillDue = findRecurringStillDue(
    recurringPatterns,
    asOfDay,
    window.endDay,
  );
  const recurringIncomeCents = sumRecurringType(recurringStillDue, 'income');
  const recurringExpenseCents = sumRecurringType(recurringStillDue, 'expense');
  const projectedRemainingIncomeCents = recurringIncomeCents;
  const projectedRemainingExpenseCents =
    projectedVariableSpendCents + recurringExpenseCents;
  const actualNetCents = actualIncomeCents - actualExpenseCents;
  const projectedRemainingNetCents =
    projectedRemainingIncomeCents - projectedRemainingExpenseCents;
  const forecastIncomeCents = actualIncomeCents + projectedRemainingIncomeCents;
  const forecastExpenseCents =
    actualExpenseCents + projectedRemainingExpenseCents;

  return {
    month: input.month,
    asOf: dateFromDayNumber(asOfDay),
    daysInMonth: window.daysInMonth,
    elapsedDays,
    remainingDays,
    actual: {
      income: centsToAmount(actualIncomeCents),
      expenses: centsToAmount(actualExpenseCents),
      net: centsToAmount(actualNetCents),
    },
    projectedRemaining: {
      income: centsToAmount(projectedRemainingIncomeCents),
      expenses: centsToAmount(projectedRemainingExpenseCents),
      net: centsToAmount(projectedRemainingNetCents),
    },
    forecast: {
      income: centsToAmount(forecastIncomeCents),
      expenses: centsToAmount(forecastExpenseCents),
      net: centsToAmount(forecastIncomeCents - forecastExpenseCents),
    },
    assumptions: {
      averageDailySpend: centsToAmount(averageDailySpendCents),
      projectedVariableSpend: centsToAmount(projectedVariableSpendCents),
      recurringIncomeStillDue: centsToAmount(recurringIncomeCents),
      recurringExpensesStillDue: centsToAmount(recurringExpenseCents),
      recurringStillDue,
    },
  };
}

function findRecurringStillDue(
  patterns: RecurringPattern[],
  asOfDay: number,
  monthEndDay: number,
): RecurringDue[] {
  const due: RecurringDue[] = [];

  for (const pattern of patterns) {
    if (!pattern.active) continue;

    let expectedDay = utcDayNumber(new Date(pattern.nextExpectedAt));
    while (expectedDay < asOfDay) {
      const nextDay = advanceCadence(expectedDay, pattern.cadence);
      if (nextDay <= expectedDay) break;
      expectedDay = nextDay;
    }

    while (expectedDay <= monthEndDay) {
      if (expectedDay >= asOfDay) {
        due.push({
          merchant: pattern.merchant,
          type: pattern.type,
          cadence: pattern.cadence,
          amount: centsToAmount(
            Math.max(0, Math.round(pattern.medianAmount * 100)),
          ),
          expectedDate: dateFromDayNumber(expectedDay),
        });
      }
      const nextDay = advanceCadence(expectedDay, pattern.cadence);
      if (nextDay <= expectedDay) break;
      expectedDay = nextDay;
    }
  }

  return due.sort(
    (left, right) =>
      left.expectedDate.localeCompare(right.expectedDate) ||
      left.type.localeCompare(right.type) ||
      left.merchant.localeCompare(right.merchant),
  );
}

function matchesRecurringPattern(
  entry: PredictionLedgerEntry,
  patterns: RecurringPattern[],
): boolean {
  if (!entry.merchant) return false;
  const entryKey = merchantKeyFromName(entry.merchant);
  if (!entryKey) return false;

  return patterns.some(
    (pattern) =>
      pattern.type === entry.type.toLowerCase() &&
      (pattern.merchantId !== null && entry.merchantId !== null
        ? pattern.merchantId === entry.merchantId
        : merchantKeyFromName(pattern.merchant) === entryKey),
  );
}

function sumType(
  entries: PredictionLedgerEntry[],
  type: PredictionLedgerEntry['type'],
): number {
  return entries
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total + Math.max(0, entry.amountCents), 0);
}

function sumRecurringType(
  entries: RecurringDue[],
  type: RecurringDue['type'],
): number {
  return entries
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total + Math.round(entry.amount * 100), 0);
}

function monthWindow(month: string): MonthWindow {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const start = Date.UTC(year, monthNumber - 1, 1);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    startDay: Math.floor(start / DAY_MS),
    endDay: Math.floor((start + (daysInMonth - 1) * DAY_MS) / DAY_MS),
    daysInMonth,
  };
}

function advanceCadence(day: number, cadence: RecurringCadence): number {
  if (cadence === 'weekly') return day + 7;
  if (cadence === 'biweekly') return day + 14;

  const date = new Date(day * DAY_MS);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const dayOfMonth = date.getUTCDate();
  const daysInNextMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return Math.floor(
    Date.UTC(year, month + 1, Math.min(dayOfMonth, daysInNextMonth)) / DAY_MS,
  );
}

function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      DAY_MS,
  );
}

function dateFromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function centsToAmount(cents: number): number {
  return cents / 100;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
