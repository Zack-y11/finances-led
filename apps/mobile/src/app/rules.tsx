import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import type { AutomationRule, LedgerOptions } from "@finance/api-client";
import { ApiState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { getFinanceApi } from "@/lib/api";

export default function RulesScreen() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [options, setOptions] = useState<LedgerOptions>();
  const [name, setName] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const api = getFinanceApi();
      const [nextRules, ledgerOptions] = await Promise.all([
        api.getAutomationRules(),
        api.getLedgerOptions(),
      ]);
      setRules(nextRules);
      setOptions(ledgerOptions);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load rules");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create() {
    const category = options?.categories[categoryIndex];
    if (!category || !name.trim() || !merchant.trim() || saving) return;
    setSaving(true);
    try {
      await getFinanceApi().createAutomationRule({
        name: name.trim(),
        conditionField: "merchant",
        conditionOp: "contains",
        conditionValue: merchant.trim(),
        actionField: "category",
        actionTargetId: category.id,
        priority: 1,
        isEnabled: true,
      });
      setName("");
      setMerchant("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create rule",
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(rule: AutomationRule) {
    try {
      await getFinanceApi().updateAutomationRule(rule.id, {
        isEnabled: !rule.isEnabled,
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update rule",
      );
    }
  }
  async function remove(id: string) {
    try {
      await getFinanceApi().deleteAutomationRule(id);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to delete rule",
      );
    }
  }

  const category = options?.categories[categoryIndex];
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="AUTOMATION"
        title="Rules you can explain."
        copy="Lower priority numbers win. Explicit confirmation choices always override these defaults."
      />
      <ApiState error={error} loading={loading} onRetry={() => void load()} />
      {!loading ? (
        <>
          <GlassSurface>
            <Text className="text-foreground font-bold">New merchant rule</Text>
            <Input
              className="mt-2"
              onChangeText={setName}
              placeholder="Rule name"
              value={name}
            />
            <Input
              className="mt-2"
              onChangeText={setMerchant}
              placeholder="Merchant contains"
              value={merchant}
            />
            {options?.categories.length ? (
              <Button
                className="mt-2"
                onPress={() =>
                  setCategoryIndex(
                    (categoryIndex + 1) % options.categories.length,
                  )
                }
                variant="outline"
              >
                <Text>Category: {category?.name} ↻</Text>
              </Button>
            ) : null}
            <Button
              className="mt-2"
              disabled={!name.trim() || !merchant.trim() || !category || saving}
              onPress={() => void create()}
            >
              <Text>{saving ? "Creating…" : "Create rule"}</Text>
            </Button>
          </GlassSurface>
          <ApiState
            empty={!rules.length}
            emptyText="No automation rules yet."
            loading={false}
          />
          {rules.map((rule) => (
            <GlassSurface key={rule.id}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-foreground font-bold">{rule.name}</Text>
                  <Text className="text-muted-foreground mt-1 text-xs">
                    {rule.conditionField} {rule.conditionOp.replace("_", " ")} “
                    {rule.conditionValue}” →{" "}
                    {rule.actionTarget?.name ?? "missing target"}
                  </Text>
                </View>
                <Badge variant={rule.isEnabled ? "success" : "outline"}>
                  <Text>{rule.isEnabled ? "On" : "Off"}</Text>
                </Badge>
              </View>
              <View className="mt-3 flex-row gap-2">
                <Button
                  className="flex-1"
                  onPress={() => void toggle(rule)}
                  size="sm"
                  variant="outline"
                >
                  <Text>{rule.isEnabled ? "Disable" : "Enable"}</Text>
                </Button>
                <Button
                  className="flex-1"
                  onPress={() => void remove(rule.id)}
                  size="sm"
                  variant="destructive"
                >
                  <Text>Delete</Text>
                </Button>
              </View>
            </GlassSurface>
          ))}
        </>
      ) : null}
    </LedgerScreen>
  );
}
