import { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";

import type { LedgerEntry } from "@finance/api-client";
import { ApiState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { Colors } from "@/constants/theme";
import { getFinanceApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { dateLabel, money } from "@finance/api-client";

export default function LedgerScreenRoute() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [editingId, setEditingId] = useState<string>();
  const [editMerchant, setEditMerchant] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const page = await getFinanceApi().getLedgerEntries({
        pageSize: 100,
        search: query.trim() || undefined,
        type: type === "all" ? undefined : type,
      });
      setEntries(page.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load ledger",
      );
    } finally {
      setLoading(false);
    }
  }, [query, type]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  function beginEdit(entry: LedgerEntry) {
    setEditingId(entry.id);
    setEditMerchant(entry.merchant);
    setEditAmount(String(entry.amount));
  }

  async function saveEdit() {
    if (!editingId) return;
    const amount = Number(editAmount);
    if (!editMerchant.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a merchant and a positive amount.");
      return;
    }
    try {
      await getFinanceApi().updateLedgerEntry(editingId, {
        merchant: editMerchant.trim(),
        amount,
      });
      setEditingId(undefined);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update entry",
      );
    }
  }

  async function remove(id: string) {
    try {
      await getFinanceApi().deleteLedgerEntry(id);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to delete entry",
      );
    }
  }

  function confirmRemove(id: string) {
    Alert.alert(
      "Delete entry?",
      "This removes the ledger event and its audit-linked record.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void remove(id),
        },
      ],
    );
  }

  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="TRANSACTIONS"
        title="Your financial record."
        copy="Search and review every event in the live ledger."
      />
      <GlassSurface>
        <Label nativeID="search-entries">Search</Label>
        <Input
          accessibilityLabel="Search entries"
          aria-labelledby="search-entries"
          className="mt-2"
          onChangeText={setQuery}
          placeholder="Search entries"
          value={query}
        />
        <View className="mt-3 flex-row gap-2">
          {(["all", "expense", "income"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={type === value ? "secondary" : "ghost"}
              className={cn("rounded-full", type === value && "bg-action-soft")}
              onPress={() => setType(value)}
            >
              <Text
                className={cn(
                  "text-xs font-bold",
                  type === value ? "text-action" : "text-muted-foreground",
                )}
              >
                {value === "all"
                  ? "All"
                  : value === "expense"
                    ? "Expenses"
                    : "Income"}
              </Text>
            </Button>
          ))}
        </View>
      </GlassSurface>
      <ApiState
        empty={!entries.length}
        emptyText="No entries match these filters."
        error={error}
        loading={loading}
        onRetry={() => void load()}
      />
      {!loading && !error && entries.length ? (
        <GlassSurface>
          {entries.map((item) => (
            <View key={item.id} className="border-border border-t py-3">
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text className="text-foreground text-sm font-bold">
                    {item.merchant}
                  </Text>
                  <Text className="text-muted-foreground mt-0.5 text-xs">
                    {item.category.name} · {dateLabel(item.occurredAt)}
                  </Text>
                  {item.status !== "posted" ? (
                    <Badge variant="review" className="mt-1 self-start">
                      <Text>{item.status}</Text>
                    </Badge>
                  ) : null}
                </View>
                <View className="items-end gap-1">
                  <Text
                    className="text-sm font-bold"
                    style={{
                      color:
                        item.type === "income"
                          ? Colors.light.success
                          : Colors.light.text,
                    }}
                  >
                    {item.type === "income" ? "+" : "−"}
                    {money(item.amount)}
                  </Text>
                  <View className="flex-row gap-1">
                    <Button
                      onPress={() => beginEdit(item)}
                      size="sm"
                      variant="ghost"
                    >
                      <Text className="text-action text-xs">Edit</Text>
                    </Button>
                    <Button
                      onPress={() => confirmRemove(item.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Text className="text-danger text-xs">Delete</Text>
                    </Button>
                  </View>
                </View>
              </View>
              {editingId === item.id ? (
                <View className="bg-surface-muted mt-3 gap-3 rounded-2xl p-3">
                  <View>
                    <Label nativeID={`edit-merchant-${item.id}`}>
                      Merchant
                    </Label>
                    <Input
                      aria-labelledby={`edit-merchant-${item.id}`}
                      className="mt-1"
                      onChangeText={setEditMerchant}
                      value={editMerchant}
                    />
                  </View>
                  <View>
                    <Label nativeID={`edit-amount-${item.id}`}>Amount</Label>
                    <Input
                      aria-labelledby={`edit-amount-${item.id}`}
                      className="mt-1"
                      keyboardType="decimal-pad"
                      onChangeText={setEditAmount}
                      value={editAmount}
                    />
                  </View>
                  <View className="flex-row justify-end gap-2">
                    <Button
                      onPress={() => setEditingId(undefined)}
                      size="sm"
                      variant="ghost"
                    >
                      <Text>Cancel</Text>
                    </Button>
                    <Button onPress={() => void saveEdit()} size="sm">
                      <Text>Save</Text>
                    </Button>
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </GlassSurface>
      ) : null}
    </LedgerScreen>
  );
}
