import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import type { LedgerOptions } from "@finance/api-client";
import type { TextIntakeProposal } from "@finance/contracts";
import { ApiState } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { getFinanceApi } from "@/lib/api";
import { money } from "@finance/api-client";

export default function CaptureScreen() {
  const [mode, setMode] = useState<"text" | "manual">("text");
  const [options, setOptions] = useState<LedgerOptions>();
  const [accountIndex, setAccountIndex] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [text, setText] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [proposal, setProposal] = useState<TextIntakeProposal>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setOptions(await getFinanceApi().getLedgerOptions());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load capture options",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void loadOptions(), 0);
    return () => clearTimeout(timer);
  }, [loadOptions]);

  function matchProposal(next: TextIntakeProposal) {
    const account =
      options?.accounts.findIndex(
        (item) =>
          item.name.toLowerCase() === next.proposal.data.account.toLowerCase(),
      ) ?? -1;
    const category =
      options?.categories.findIndex(
        (item) =>
          item.name.toLowerCase() === next.proposal.data.category.toLowerCase(),
      ) ?? -1;
    if (account >= 0) setAccountIndex(account);
    if (category >= 0) setCategoryIndex(category);
  }

  async function parse() {
    if (!text.trim() || saving) return;
    setSaving(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const next = await getFinanceApi().parseTextCommand({
        text: text.trim(),
      });
      setProposal(next);
      matchProposal(next);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to parse entry",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirm() {
    const account = options?.accounts[accountIndex];
    const category = options?.categories[categoryIndex];
    if (!proposal || !account || !category || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const data = proposal.proposal.data;
      await getFinanceApi().confirmReviewItem(proposal.sessionId, {
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        merchant: data.merchant,
        note: data.note,
        accountId: account.id,
        categoryId: category.id,
        occurredAt: `${data.occurredAt}T12:00:00.000Z`,
      });
      setProposal(undefined);
      setText("");
      setMessage("Entry posted to the ledger.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to confirm entry",
      );
    } finally {
      setSaving(false);
    }
  }

  async function dismiss() {
    if (!proposal || saving) return;
    setSaving(true);
    try {
      await getFinanceApi().dismissReviewItem(proposal.sessionId);
      setProposal(undefined);
      setMessage("Proposal dismissed.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to dismiss proposal",
      );
    } finally {
      setSaving(false);
    }
  }

  async function createManual() {
    const account = options?.accounts[accountIndex];
    const category = options?.categories[categoryIndex];
    const parsedAmount = Number(amount);
    if (
      !account ||
      !category ||
      !merchant.trim() ||
      parsedAmount <= 0 ||
      saving
    )
      return;
    setSaving(true);
    setError(undefined);
    try {
      await getFinanceApi().createLedgerEntry({
        type: entryType,
        amount: parsedAmount,
        currency: "USD",
        merchant: merchant.trim(),
        accountId: account.id,
        categoryId: category.id,
        occurredAt: `${new Date().toISOString().slice(0, 10)}T12:00:00.000Z`,
        inputMethod: "manual",
      });
      setMerchant("");
      setAmount("");
      setMessage("Manual entry posted to the ledger.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save entry");
    } finally {
      setSaving(false);
    }
  }

  const account = options?.accounts[accountIndex];
  const category = options?.categories[categoryIndex];
  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="QUICK CAPTURE"
        title="Capture it while it is fresh."
        copy="Create a manual entry or turn text into a structured proposal."
      />
      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          onPress={() => setMode("text")}
          variant={mode === "text" ? "default" : "outline"}
        >
          <Text>Text command</Text>
        </Button>
        <Button
          className="flex-1"
          onPress={() => setMode("manual")}
          variant={mode === "manual" ? "default" : "outline"}
        >
          <Text>Manual</Text>
        </Button>
      </View>
      <ApiState
        error={error}
        loading={loading}
        onRetry={() => void loadOptions()}
      />
      {message ? (
        <GlassSurface>
          <Text className="text-success text-center font-semibold">
            {message}
          </Text>
        </GlassSurface>
      ) : null}
      {!loading &&
      options &&
      (!options.accounts.length || !options.categories.length) ? (
        <ApiState
          empty
          emptyText="Create an account and category in Settings before capturing entries."
          loading={false}
        />
      ) : null}
      {!loading && options?.accounts.length && options.categories.length ? (
        <>
          {mode === "text" ? (
            <GlassSurface>
              <Label>WHAT HAPPENED?</Label>
              <Input
                multiline
                className="mt-2 min-h-[120px] py-3"
                onChangeText={(value) => {
                  setText(value);
                  setProposal(undefined);
                }}
                placeholder="e.g. Gaste 3.19 en Starbucks con BAC"
                style={{ textAlignVertical: "top" }}
                value={text}
              />
              <Button
                className="mt-3"
                disabled={!text.trim() || saving}
                onPress={() => void parse()}
              >
                <Text>{saving ? "Interpreting…" : "Interpret entry →"}</Text>
              </Button>
            </GlassSurface>
          ) : (
            <GlassSurface>
              <Label>MERCHANT</Label>
              <Input
                className="mt-2"
                onChangeText={setMerchant}
                value={merchant}
              />
              <Label className="mt-3">AMOUNT</Label>
              <Input
                className="mt-2"
                keyboardType="decimal-pad"
                onChangeText={setAmount}
                value={amount}
              />
              <View className="mt-3 flex-row gap-2">
                <Button
                  className="flex-1"
                  onPress={() => setEntryType("expense")}
                  variant={entryType === "expense" ? "secondary" : "outline"}
                >
                  <Text>Expense</Text>
                </Button>
                <Button
                  className="flex-1"
                  onPress={() => setEntryType("income")}
                  variant={entryType === "income" ? "secondary" : "outline"}
                >
                  <Text>Income</Text>
                </Button>
              </View>
              <OptionButtons
                account={account?.name}
                category={category?.name}
                nextAccount={() =>
                  setAccountIndex((accountIndex + 1) % options.accounts.length)
                }
                nextCategory={() =>
                  setCategoryIndex(
                    (categoryIndex + 1) % options.categories.length,
                  )
                }
              />
              <Button
                className="mt-3"
                disabled={saving || !merchant.trim() || Number(amount) <= 0}
                onPress={() => void createManual()}
              >
                <Text>{saving ? "Saving…" : "Save entry"}</Text>
              </Button>
            </GlassSurface>
          )}
          {proposal ? (
            <GlassSurface>
              <Text className="text-action text-[11px] font-bold tracking-wider">
                PROPOSAL PREVIEW
              </Text>
              <Text className="text-foreground mt-2 text-lg font-bold">
                {proposal.proposal.data.category} ·{" "}
                {money(proposal.proposal.data.amount)}
              </Text>
              <Text className="text-muted-foreground mt-1 text-[13px]">
                {(proposal.proposal.confidence * 100).toFixed(0)}% confidence ·
                explicit confirmation required
              </Text>
              <OptionButtons
                account={account?.name}
                category={category?.name}
                nextAccount={() =>
                  setAccountIndex((accountIndex + 1) % options.accounts.length)
                }
                nextCategory={() =>
                  setCategoryIndex(
                    (categoryIndex + 1) % options.categories.length,
                  )
                }
              />
              {proposal.appliedRules.length ? (
                <Text className="text-muted-foreground mt-2 text-xs">
                  Rules:{" "}
                  {proposal.appliedRules.map((rule) => rule.name).join(", ")}
                </Text>
              ) : null}
              <View className="mt-3 flex-row gap-2">
                <Button
                  className="flex-1"
                  disabled={saving}
                  onPress={() => void dismiss()}
                  variant="outline"
                >
                  <Text>Dismiss</Text>
                </Button>
                <Button
                  className="flex-1"
                  disabled={saving}
                  onPress={() => void confirm()}
                >
                  <Text>Confirm</Text>
                </Button>
              </View>
            </GlassSurface>
          ) : null}
        </>
      ) : null}
    </LedgerScreen>
  );
}

function OptionButtons({
  account,
  category,
  nextAccount,
  nextCategory,
}: {
  account?: string;
  category?: string;
  nextAccount: () => void;
  nextCategory: () => void;
}) {
  return (
    <View className="mt-3 gap-2">
      <Button onPress={nextAccount} variant="outline">
        <Text>Account: {account ?? "None"} ↻</Text>
      </Button>
      <Button onPress={nextCategory} variant="outline">
        <Text>Category: {category ?? "None"} ↻</Text>
      </Button>
    </View>
  );
}
