import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { EntryGroupDetail, LedgerOptions } from "@finance/api-client";
import { ApiState } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { getFinanceApi } from "@/lib/api";
import { dateLabel, money } from "@finance/api-client";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<EntryGroupDetail>();
  const [options, setOptions] = useState<LedgerOptions>();
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const api = getFinanceApi();
      const [detail, ledgerOptions] = await Promise.all([
        api.getEntryGroup(id),
        api.getLedgerOptions(),
      ]);
      setGroup(detail);
      setOptions(ledgerOptions);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load group");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function append() {
    const account = options?.accounts[0];
    const category = options?.categories[0];
    const value = Number(amount);
    if (
      !id ||
      !account ||
      !category ||
      !merchant.trim() ||
      value <= 0 ||
      saving
    )
      return;
    setSaving(true);
    try {
      await getFinanceApi().appendEntryToGroup(id, {
        type: "expense",
        amount: value,
        currency: "USD",
        merchant: merchant.trim(),
        accountId: account.id,
        categoryId: category.id,
        occurredAt: `${new Date().toISOString().slice(0, 10)}T12:00:00.000Z`,
        inputMethod: "manual",
      });
      setMerchant("");
      setAmount("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to append entry",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerScreen>
      <Button
        className="self-start"
        onPress={() => router.back()}
        size="sm"
        variant="ghost"
      >
        <Text>← Back</Text>
      </Button>
      <ScreenHeader
        eyebrow="ENTRY GROUP"
        title={group?.name ?? "Group"}
        copy={
          group
            ? `${money(group.total)} across ${group.ledgerEntries.length} entries`
            : "Loading group details"
        }
      />
      <ApiState error={error} loading={loading} onRetry={() => void load()} />
      {group ? (
        <>
          <GlassSurface>
            <Text className="text-foreground font-bold">Append expense</Text>
            <Input
              className="mt-2"
              onChangeText={setMerchant}
              placeholder="Merchant"
              value={merchant}
            />
            <Input
              className="mt-2"
              keyboardType="decimal-pad"
              onChangeText={setAmount}
              placeholder="Amount"
              value={amount}
            />
            <Text className="text-muted-foreground mt-2 text-xs">
              Uses the first active account and category; change defaults from
              Settings.
            </Text>
            <Button
              className="mt-3"
              disabled={saving || !merchant.trim() || Number(amount) <= 0}
              onPress={() => void append()}
            >
              <Text>{saving ? "Adding…" : "Add to group"}</Text>
            </Button>
          </GlassSurface>
          <GlassSurface>
            {group.ledgerEntries.length ? (
              group.ledgerEntries.map((entry) => (
                <View
                  className="border-border flex-row justify-between border-t py-3"
                  key={entry.id}
                >
                  <View>
                    <Text className="text-foreground font-semibold">
                      {entry.merchant}
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      {dateLabel(entry.occurredAt)}
                    </Text>
                  </View>
                  <Text className="text-foreground font-bold">
                    {money(entry.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-muted-foreground text-center">
                No entries in this group.
              </Text>
            )}
          </GlassSurface>
        </>
      ) : null}
    </LedgerScreen>
  );
}
