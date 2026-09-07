import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import type { Account, Category } from "@finance/api-client";
import { ApiState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { getFinanceApi } from "@/lib/api";

export default function EntitySettingsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountName, setAccountName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const api = getFinanceApi();
      const [nextAccounts, nextCategories] = await Promise.all([
        api.getAccounts(),
        api.getCategories(),
      ]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load settings",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function createAccount() {
    if (!accountName.trim() || saving) return;
    setSaving(true);
    try {
      await getFinanceApi().createAccount({
        name: accountName.trim(),
        type: "bank",
        currency: "USD",
      });
      setAccountName("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create account",
      );
    } finally {
      setSaving(false);
    }
  }
  async function createCategory() {
    if (!categoryName.trim() || saving) return;
    setSaving(true);
    try {
      await getFinanceApi().createCategory({
        name: categoryName.trim(),
        kind: "expense",
      });
      setCategoryName("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create category",
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(account: Account) {
    try {
      await getFinanceApi().updateAccount(account.id, {
        isActive: !account.isActive,
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update account",
      );
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
        eyebrow="ACCOUNTS & CATEGORIES"
        title="Keep the ledger structured."
        copy="Manage the live account and category options used by every capture flow."
      />
      <ApiState error={error} loading={loading} onRetry={() => void load()} />
      {!loading ? (
        <>
          <GlassSurface>
            <Text className="text-foreground text-[17px] font-bold">
              Accounts
            </Text>
            <Input
              className="mt-3"
              onChangeText={setAccountName}
              placeholder="New account"
              value={accountName}
            />
            <Button
              className="mt-2"
              disabled={!accountName.trim() || saving}
              onPress={() => void createAccount()}
            >
              <Text>Add account</Text>
            </Button>
            {accounts.map((account) => (
              <View
                className="border-border flex-row items-center justify-between border-t py-3"
                key={account.id}
              >
                <View>
                  <Text className="text-foreground text-sm font-semibold">
                    {account.name}
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    {account.type.replace("_", " ")} · {account.currency}
                  </Text>
                </View>
                <Button
                  onPress={() => void toggle(account)}
                  size="sm"
                  variant="ghost"
                >
                  <Badge variant={account.isActive ? "success" : "outline"}>
                    <Text>{account.isActive ? "Active" : "Inactive"}</Text>
                  </Badge>
                </Button>
              </View>
            ))}
          </GlassSurface>
          <GlassSurface>
            <Text className="text-foreground text-[17px] font-bold">
              Categories
            </Text>
            <Input
              className="mt-3"
              onChangeText={setCategoryName}
              placeholder="New expense category"
              value={categoryName}
            />
            <Button
              className="mt-2"
              disabled={!categoryName.trim() || saving}
              onPress={() => void createCategory()}
            >
              <Text>Add category</Text>
            </Button>
            {categories.map((category) => (
              <View
                className="border-border flex-row items-center justify-between border-t py-3"
                key={category.id}
              >
                <Text className="text-foreground text-sm font-semibold">
                  {category.name}
                </Text>
                <Badge variant="outline">
                  <Text>{category.kind}</Text>
                </Badge>
              </View>
            ))}
          </GlassSurface>
        </>
      ) : null}
    </LedgerScreen>
  );
}
