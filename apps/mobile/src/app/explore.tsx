import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassSurface } from "@/components/ui/glass-surface";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { currency, mobileTransactions } from "@/constants/fixtures";
import { Colors, Fonts, Spacing } from "@/constants/theme";

export default function LedgerScreenRoute() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const entries = useMemo(
    () =>
      mobileTransactions.filter(
        (entry) =>
          (type === "all" || entry.type === type) &&
          [entry.merchant, entry.category]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, type],
  );
  return (
    <LedgerScreen>
      <View>
        <Text style={styles.eyebrow}>TRANSACTIONS</Text>
        <Text style={styles.title}>Your financial record.</Text>
        <Text style={styles.copy}>
          Search and review every event in the ledger.
        </Text>
      </View>
      <GlassSurface>
        <TextInput
          accessibilityLabel="Search entries"
          onChangeText={setQuery}
          placeholder="Search entries"
          placeholderTextColor={Colors.light.textSecondary}
          style={styles.search}
          value={query}
        />
        <View style={styles.filters}>
          {(["all", "expense", "income"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setType(value)}
              style={[styles.filter, type === value && styles.filterActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  type === value && styles.filterTextActive,
                ]}
              >
                {value === "all"
                  ? "All"
                  : value === "expense"
                    ? "Expenses"
                    : "Income"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.list}>
          {entries.map((item) => (
            <View key={item.id} style={styles.entry}>
              <View
                style={[
                  styles.entryIcon,
                  {
                    backgroundColor:
                      item.type === "income"
                        ? Colors.light.successSoft
                        : Colors.light.dangerSoft,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      item.type === "income"
                        ? Colors.light.success
                        : Colors.light.danger,
                  }}
                >
                  {item.type === "income" ? "↑" : "↓"}
                </Text>
              </View>
              <View style={styles.entryText}>
                <Text style={styles.entryTitle}>{item.merchant}</Text>
                <Text style={styles.entryMeta}>
                  {item.category} · {item.date}
                </Text>
              </View>
              <View style={styles.amountColumn}>
                {item.status === "review" ? (
                  <Text style={styles.review}>Review</Text>
                ) : null}
                <Text
                  style={[
                    styles.amount,
                    {
                      color:
                        item.type === "income"
                          ? Colors.light.success
                          : Colors.light.text,
                    },
                  ]}
                >
                  {item.type === "income" ? "+" : "−"}
                  {currency(item.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </GlassSurface>
    </LedgerScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: Colors.light.action,
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    color: Colors.light.text,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    marginTop: 4,
  },
  copy: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  search: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.border,
    borderWidth: 1,
    borderRadius: 8,
    color: Colors.light.text,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  filters: { flexDirection: "row", gap: 8, marginTop: 12 },
  filter: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: Colors.light.actionSoft },
  filterText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  filterTextActive: { color: Colors.light.action },
  list: { marginTop: Spacing.three },
  entry: {
    alignItems: "center",
    borderTopColor: Colors.light.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
  },
  entryIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  entryText: { flex: 1 },
  entryTitle: { color: Colors.light.text, fontSize: 14, fontWeight: "700" },
  entryMeta: { color: Colors.light.textSecondary, fontSize: 12, marginTop: 3 },
  amountColumn: { alignItems: "flex-end" },
  amount: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  review: { color: Colors.light.review, fontSize: 10, fontWeight: "700" },
});
