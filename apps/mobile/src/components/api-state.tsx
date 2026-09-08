import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Text } from "@/components/ui/text";

export function ApiState({
  loading,
  error,
  empty,
  onRetry,
  emptyText = "Nothing to show yet.",
}: {
  loading: boolean;
  error?: string;
  empty?: boolean;
  onRetry?: () => void;
  emptyText?: string;
}) {
  if (!loading && !error && !empty) return null;
  return (
    <GlassSurface>
      <View className="items-center gap-3 py-4">
        <Text className="text-foreground text-center font-semibold">
          {loading ? "Loading…" : (error ?? emptyText)}
        </Text>
        {error && onRetry ? (
          <Button onPress={onRetry} size="sm" variant="outline">
            <Text>Retry</Text>
          </Button>
        ) : null}
      </View>
    </GlassSurface>
  );
}
