import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { currency, mobileGroups } from '@/constants/fixtures';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function GroupsScreen() {
  return <LedgerScreen><View><Text style={styles.eyebrow}>ENTRY GROUPS</Text><Text style={styles.title}>Related spending, together.</Text><Text style={styles.copy}>Groups retain every individual entry while keeping a larger event understandable.</Text></View><View style={styles.list}>{mobileGroups.map((group) => <GlassSurface key={group.id}><View style={styles.row}><View style={styles.copyBlock}><Text style={styles.groupType}>EXPENSE GROUP</Text><Text style={styles.groupName}>{group.name}</Text><Text style={styles.groupMeta}>{group.entries} linked entries</Text></View><View style={styles.amountBlock}><Text style={styles.groupAmount}>{currency(group.total)}</Text><Text style={styles.arrow}>›</Text></View></View></GlassSurface>)}</View></LedgerScreen>;
}

const styles = StyleSheet.create({
  eyebrow: { color: Colors.light.action, fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: Colors.light.text, fontSize: 28, fontWeight: '700', lineHeight: 34, marginTop: 4 },
  copy: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  list: { gap: Spacing.two },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  copyBlock: { flex: 1 },
  groupType: { color: Colors.light.action, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  groupName: { color: Colors.light.text, fontSize: 17, fontWeight: '700', marginTop: 5 },
  groupMeta: { color: Colors.light.textSecondary, fontSize: 13, marginTop: 5 },
  amountBlock: { alignItems: 'flex-end', gap: 4 },
  groupAmount: { color: Colors.light.text, fontSize: 16, fontWeight: '700' },
  arrow: { color: Colors.light.action, fontSize: 24, lineHeight: 24 },
});
