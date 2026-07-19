import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { currency, mobileTransactions } from '@/constants/fixtures';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function OverviewScreen() {
  return <LedgerScreen><View><Text style={styles.eyebrow}>FINANCIAL OVERVIEW</Text><Text style={styles.title}>Make the month visible.</Text><Text style={styles.copy}>A clear view of income, spending, and the net you have left to direct.</Text></View><View style={styles.metrics}><Metric label="Income" value="$2,720.00" color={Colors.light.success} /><Metric label="Expenses" value="$423.85" color={Colors.light.danger} /><Metric label="Net position" value="$2,296.15" color={Colors.light.action} /><Metric label="Month" value="July 2026" color={Colors.light.text} /></View><GlassSurface><Text style={styles.sectionTitle}>This month</Text><Text style={styles.sectionCopy}>Net income continues to outpace your planned spending.</Text><View style={styles.bars}>{[30, 45, 35, 58, 42, 76].map((height, index) => <View key={height + index} style={styles.barColumn}><View style={[styles.bar, { height }]} /><Text style={styles.barLabel}>{['F', 'M', 'A', 'M', 'J', 'J'][index]}</Text></View>)}</View></GlassSurface><GlassSurface><View style={styles.rowBetween}><View><Text style={styles.sectionTitle}>Recent activity</Text><Text style={styles.sectionCopy}>Latest ledger entries</Text></View><Text style={styles.link}>Ledger</Text></View><View style={styles.list}>{mobileTransactions.slice(0, 3).map((item) => <View key={item.id} style={styles.entry}><View style={[styles.entryIcon, { backgroundColor: item.type === 'income' ? Colors.light.successSoft : Colors.light.dangerSoft }]}><Text style={{ color: item.type === 'income' ? Colors.light.success : Colors.light.danger }}>{item.type === 'income' ? '↑' : '↓'}</Text></View><View style={styles.entryText}><Text style={styles.entryTitle}>{item.merchant}</Text><Text style={styles.entryMeta}>{item.category} · {item.date}</Text></View><Text style={[styles.amount, { color: item.type === 'income' ? Colors.light.success : Colors.light.text }]}>{item.type === 'income' ? '+' : '−'}{currency(item.amount)}</Text></View>)}</View></GlassSurface></LedgerScreen>;
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color }]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  eyebrow: { color: Colors.light.action, fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: Colors.light.text, fontFamily: Fonts.sans, fontSize: 28, fontWeight: '700', lineHeight: 34, marginTop: 4 },
  copy: { color: Colors.light.textSecondary, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, marginTop: 8 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metric: { backgroundColor: Colors.light.backgroundElement, borderColor: Colors.light.border, borderWidth: 1, borderRadius: 16, flexGrow: 1, minWidth: '45%', padding: Spacing.three },
  metricLabel: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: '600' },
  metricValue: { fontSize: 19, fontWeight: '700', marginTop: 12 },
  sectionTitle: { color: Colors.light.text, fontSize: 17, fontWeight: '700' },
  sectionCopy: { color: Colors.light.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  bars: { alignItems: 'flex-end', flexDirection: 'row', gap: 12, height: 110, marginTop: 24 },
  barColumn: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 6 },
  bar: { backgroundColor: Colors.light.success, borderRadius: 5, minHeight: 12, width: '100%' },
  barLabel: { color: Colors.light.textSecondary, fontSize: 11 },
  rowBetween: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: Colors.light.action, fontSize: 13, fontWeight: '700' },
  list: { marginTop: Spacing.three },
  entry: { alignItems: 'center', borderTopColor: Colors.light.border, borderTopWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 12 },
  entryIcon: { alignItems: 'center', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  entryText: { flex: 1 },
  entryTitle: { color: Colors.light.text, fontSize: 14, fontWeight: '700' },
  entryMeta: { color: Colors.light.textSecondary, fontSize: 12, marginTop: 3 },
  amount: { fontSize: 14, fontWeight: '700' },
});
