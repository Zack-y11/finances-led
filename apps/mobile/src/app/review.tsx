import { StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/ui/glass-surface";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { Colors, Fonts, Spacing } from "@/constants/theme";

const items = [
  "Starbucks · low category confidence",
  "Unknown merchant · account needed",
  "Super Selectos · receipt total differs",
];

export default function ReviewScreen() {
  return (
    <LedgerScreen>
      <View>
        <Text style={styles.eyebrow}>REVIEW INBOX</Text>
        <Text style={styles.title}>Keep automation explainable.</Text>
        <Text style={styles.copy}>
          Every uncertain proposal waits for an intentional decision.
        </Text>
      </View>
      <View style={styles.metrics}>
        <Metric label="Pending" value="3" color={Colors.light.actionSoft} />
        <Metric label="Attention" value="2" color={Colors.light.reviewSoft} />
      </View>
      <GlassSurface>
        <Text style={styles.section}>Items to review</Text>
        {items.map((item) => (
          <View key={item} style={styles.item}>
            <View style={styles.dot} />
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{item.split(" · ")[0]}</Text>
              <Text style={styles.itemMeta}>{item.split(" · ")[1]}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
      </GlassSurface>
    </LedgerScreen>
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
    <View style={[styles.metric, { backgroundColor: color }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
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
  metrics: { flexDirection: "row", gap: Spacing.two },
  metric: { borderRadius: 16, flex: 1, padding: Spacing.three },
  metricLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    color: Colors.light.text,
    fontSize: 26,
    fontWeight: "700",
    marginTop: 12,
  },
  section: { color: Colors.light.text, fontSize: 17, fontWeight: "700" },
  item: {
    alignItems: "center",
    borderTopColor: Colors.light.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 14,
  },
  dot: {
    backgroundColor: Colors.light.review,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  itemText: { flex: 1 },
  itemTitle: { color: Colors.light.text, fontSize: 14, fontWeight: "700" },
  itemMeta: { color: Colors.light.textSecondary, fontSize: 12, marginTop: 3 },
  chevron: { color: Colors.light.action, fontSize: 22 },
});
