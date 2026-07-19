import { StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/ui/glass-surface";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { Colors, Fonts } from "@/constants/theme";

export default function EntitySettingsScreen() {
  return (
    <LedgerScreen>
      <View>
        <Text style={styles.eyebrow}>ACCOUNTS & CATEGORIES</Text>
        <Text style={styles.title}>Keep the ledger structured.</Text>
        <Text style={styles.copy}>
          Fixture entities show the management component before persistence is
          connected.
        </Text>
      </View>
      <EntitySection
        title="Accounts"
        values={["BAC Checking", "Cash", "Credit card"]}
      />
      <EntitySection
        title="Categories"
        values={["Groceries", "Dining", "Transport", "Utilities", "Income"]}
      />
    </LedgerScreen>
  );
}

function EntitySection({ title, values }: { title: string; values: string[] }) {
  return (
    <GlassSurface>
      <Text style={styles.section}>{title}</Text>
      {values.map((value) => (
        <View key={value} style={styles.row}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.active}>Active</Text>
        </View>
      ))}
    </GlassSurface>
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
  section: { color: Colors.light.text, fontSize: 17, fontWeight: "700" },
  row: {
    alignItems: "center",
    borderTopColor: Colors.light.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  value: { color: Colors.light.text, fontSize: 14, fontWeight: "600" },
  active: {
    backgroundColor: Colors.light.successSoft,
    borderRadius: 999,
    color: Colors.light.success,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
});
