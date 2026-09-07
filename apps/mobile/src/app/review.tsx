import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import type { LedgerOptions } from "@finance/api-client";
import type { ReviewItem, ReviewItemsResponse } from "@finance/contracts";
import { ApiState } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import { getFinanceApi } from "@/lib/api";
import { dateLabel, money } from "@finance/api-client";

export default function ReviewScreen() {
  const [review, setReview] = useState<ReviewItemsResponse>();
  const [options, setOptions] = useState<LedgerOptions>();
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const api = getFinanceApi();
      const [nextReview, nextOptions] = await Promise.all([
        api.getReviewItems(),
        api.getLedgerOptions(),
      ]);
      setReview(nextReview);
      setOptions(nextOptions);
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load review inbox",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function targetId(items: { id: string; name: string }[], name: string) {
    return (
      items.find((item) => item.name.toLowerCase() === name.toLowerCase())
        ?.id ?? items[0]?.id
    );
  }
  async function confirm(item: ReviewItem) {
    const accountId = targetId(
      options?.accounts ?? [],
      item.proposal.data.account,
    );
    const categoryId = targetId(
      options?.categories ?? [],
      item.proposal.data.category,
    );
    if (!accountId || !categoryId) {
      setError("Create an account and category before confirming.");
      return;
    }
    setActingId(item.id);
    try {
      const data = item.proposal.data;
      await getFinanceApi().confirmReviewItem(item.id, {
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        merchant: data.merchant,
        note: data.note,
        accountId,
        categoryId,
        occurredAt: `${data.occurredAt}T12:00:00.000Z`,
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to confirm proposal",
      );
    } finally {
      setActingId(undefined);
    }
  }
  async function dismiss(id: string) {
    setActingId(id);
    try {
      await getFinanceApi().dismissReviewItem(id);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to dismiss proposal",
      );
    } finally {
      setActingId(undefined);
    }
  }

  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="AI REVIEW"
        title="Review inbox."
        copy="Unconfirmed structured proposals stay here; original command text is never retained."
      />
      {review ? (
        <View className="flex-row gap-2">
          <Metric label="Pending" value={review.metrics.pending} />
          <Metric
            label="High confidence"
            value={review.metrics.highConfidence}
          />
          <Metric label="Attention" value={review.metrics.needsAttention} />
        </View>
      ) : null}
      <ApiState
        empty={!review?.data.length}
        emptyText="No pending proposals."
        error={error}
        loading={loading}
        onRetry={() => void load()}
      />
      {review?.data.map((item) => {
        const data = item.proposal.data;
        return (
          <GlassSurface key={item.id}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-foreground font-bold">
                  {data.merchant ?? data.note ?? "Ledger proposal"}
                </Text>
                <Text className="text-muted-foreground mt-1 text-xs">
                  {data.category} · {data.account} ·{" "}
                  {dateLabel(data.occurredAt)}
                </Text>
              </View>
              <Badge variant="review">
                <Text>{(item.proposal.confidence * 100).toFixed(0)}%</Text>
              </Badge>
            </View>
            <Text className="text-foreground mt-3 text-xl font-bold">
              {money(data.amount)}
            </Text>
            {item.appliedRules.length ? (
              <Text className="text-muted-foreground mt-2 text-xs">
                Rules: {item.appliedRules.map((rule) => rule.name).join(", ")}
              </Text>
            ) : null}
            <View className="mt-3 flex-row gap-2">
              <Button
                className="flex-1"
                disabled={actingId === item.id}
                onPress={() => void dismiss(item.id)}
                variant="outline"
              >
                <Text>Dismiss</Text>
              </Button>
              <Button
                className="flex-1"
                disabled={actingId === item.id}
                onPress={() => void confirm(item)}
              >
                <Text>{actingId === item.id ? "Working…" : "Confirm"}</Text>
              </Button>
            </View>
          </GlassSurface>
        );
      })}
    </LedgerScreen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <GlassSurface className="min-w-0 flex-1">
      <Text className="text-muted-foreground text-[10px] font-semibold">
        {label}
      </Text>
      <Text className="text-action mt-1 text-xl font-bold">{value}</Text>
    </GlassSurface>
  );
}
