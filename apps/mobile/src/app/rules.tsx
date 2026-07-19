import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const rules = [{ name: 'Starbucks → Dining', usage: 'Applied 12 times', active: true }, { name: 'Uber → Transport', usage: 'Applied 8 times', active: true }, { name: 'Salary → BAC Checking', usage: 'Applied 2 times', active: false }];

export default function RulesScreen() {
  return <LedgerScreen><View><Text style={styles.eyebrow}>AUTOMATION RULES</Text><Text style={styles.title}>Make repeated choices once.</Text><Text style={styles.copy}>Rules are clear, visible, and ready to explain each suggested action.</Text></View><View style={styles.list}>{rules.map((rule) => <GlassSurface key={rule.name}><View style={styles.row}><View style={styles.grow}><Text style={styles.ruleName}>{rule.name}</Text><Text style={styles.ruleUsage}>{rule.usage}</Text></View><Text style={[styles.status, { backgroundColor: rule.active ? Colors.light.successSoft : Colors.light.background, color: rule.active ? Colors.light.success : Colors.light.textSecondary }]}>{rule.active ? 'Active' : 'Paused'}</Text></View></GlassSurface>)}</View></LedgerScreen>;
}

const styles = StyleSheet.create({
  eyebrow: { color: Colors.light.action, fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }, title: { color: Colors.light.text, fontSize: 28, fontWeight: '700', lineHeight: 34, marginTop: 4 }, copy: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 }, list: { gap: Spacing.two }, row: { alignItems: 'center', flexDirection: 'row', gap: 12 }, grow: { flex: 1 }, ruleName: { color: Colors.light.text, fontSize: 16, fontWeight: '700' }, ruleUsage: { color: Colors.light.textSecondary, fontSize: 13, marginTop: 5 }, status: { borderRadius: 999, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
});
