import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import type { EntryGroup } from "@finance/api-client";
import { ApiState } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { getFinanceApi } from "@/lib/api";
import { money } from "@finance/api-client";

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<EntryGroup[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setGroups(await getFinanceApi().getEntryGroups());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load groups",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await getFinanceApi().createEntryGroup({
        name: name.trim(),
        type: "expense",
      });
      setName("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create group",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="ENTRY GROUPS"
        title="Related spending, together."
        copy="Live group totals remain calculated from their individual ledger entries."
      />
      <GlassSurface>
        <Text className="text-foreground font-bold">Create a group</Text>
        <Input
          className="mt-2"
          onChangeText={setName}
          placeholder="August trip"
          value={name}
        />
        <Button
          className="mt-3"
          disabled={!name.trim() || saving}
          onPress={() => void create()}
        >
          <Text>{saving ? "Creating…" : "Create group"}</Text>
        </Button>
      </GlassSurface>
      <ApiState
        empty={!groups.length}
        emptyText="No groups yet."
        error={error}
        loading={loading}
        onRetry={() => void load()}
      />
      {!loading && !error ? (
        <View className="gap-2">
          {groups.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => router.push(`/groups/${group.id}` as never)}
            >
              <GlassSurface>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-action text-[10px] font-bold tracking-wider">
                      {group.type.toUpperCase()} GROUP
                    </Text>
                    <Text className="text-foreground mt-1 text-[17px] font-bold">
                      {group.name}
                    </Text>
                    <Text className="text-muted-foreground mt-1 text-[13px]">
                      {group.description ?? "Tap to view entries"}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-foreground text-base font-bold">
                      {money(group.total)}
                    </Text>
                    <Text className="text-action text-2xl leading-6">›</Text>
                  </View>
                </View>
              </GlassSurface>
            </Pressable>
          ))}
        </View>
      ) : null}
    </LedgerScreen>
  );
}
