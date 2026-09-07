import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import type { AnalyticsSummary, LedgerEntry } from "@finance/api-client";
import { ApiState } from "@/components/api-state";
import { GlassSurface } from "@/components/ui/glass-surface";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { Colors } from "@/constants/theme";
import { getFinanceApi } from "@/lib/api";
import { currentMonth, dateLabel, money } from "@finance/api-client";

export default function OverviewScreen() {
  const [summary, setSummary] = useState<AnalyticsSummary>();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const api = getFinanceApi();
      const [nextSummary, ledger] = await Promise.all([
        api.getMonthlySummary(currentMonth()),
        api.getLedgerEntries({ pageSize: 5 }),
      ]);
      setSummary(nextSummary);
      setEntries(ledger.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load overview",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="FINANCIAL OVERVIEW"
        title="Make the month visible."
        copy="Live income, spending, net position, and recent ledger activity."
      />
      <ApiState error={error} loading={loading} onRetry={() => void load()} />
      {summary ? (
        <View className="flex-row flex-wrap gap-2">
          <Metric
            label="Income"
            value={money(summary.income)}
            color={Colors.light.success}
          />
          <Metric
            label="Expenses"
            value={money(summary.expenses)}
            color={Colors.light.danger}
          />
          <Metric
            label="Net position"
            value={money(summary.net)}
            color={Colors.light.action}
          />
          <Metric
            label="Month"
            value={summary.month}
            color={Colors.light.text}
          />
        </View>
      ) : null}
      {!loading && !error ? (
        <GlassSurface>
          <Text className="text-foreground text-[17px] font-bold">
            Recent activity
          </Text>
          <View className="mt-3">
            {entries.length ? (
              entries.map((item) => <EntryRow entry={item} key={item.id} />)
            ) : (
              <Text className="text-muted-foreground py-4 text-center text-sm">
                No ledger entries yet.
              </Text>
            )}
          </View>
        </GlassSurface>
      ) : null}
    </LedgerScreen>
  );
}

function EntryRow({ entry }: { entry: LedgerEntry }) {
  const income = entry.type === "income";
  return (
    <View className="border-border flex-row items-center gap-3 border-t py-3">
      <View className="flex-1">
        <Text className="text-foreground text-sm font-bold">
          {entry.merchant}
        </Text>
        <Text className="text-muted-foreground mt-0.5 text-xs">
          {entry.category.name} · {dateLabel(entry.occurredAt)}
        </Text>
      </View>
      <Text
        className="text-sm font-bold"
        style={{ color: income ? Colors.light.success : Colors.light.text }}
      >
        {income ? "+" : "−"}
        {money(entry.amount)}
      </Text>
    </View>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className="border-border bg-surface min-w-[45%] grow rounded-2xl border p-3">
      <Text className="text-muted-foreground text-xs font-semibold">
        {label}
      </Text>
      <Text className="mt-3 text-[19px] font-bold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}
