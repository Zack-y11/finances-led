import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  return <LedgerScreen><View><Text style={styles.eyebrow}>SETTINGS</Text><Text style={styles.title}>Control your workspace.</Text><Text style={styles.copy}>Configuration components are ready for account, privacy, and display preferences.</Text></View><Link href={'/settings/entities' as any} style={styles.link}><GlassSurface><Text style={styles.itemTitle}>Accounts & categories</Text><Text style={styles.itemCopy}>Manage the entities behind each ledger entry.</Text></GlassSurface></Link><Link href={'/review' as any} style={styles.link}><GlassSurface><Text style={styles.itemTitle}>Review inbox</Text><Text style={styles.itemCopy}>Inspect basic and enhanced proposal-review states.</Text></GlassSurface></Link><Link href={'/rules' as any} style={styles.link}><GlassSurface><Text style={styles.itemTitle}>Automation rules</Text><Text style={styles.itemCopy}>Review the reusable automation rule components.</Text></GlassSurface></Link><GlassSurface><Text style={styles.itemTitle}>Privacy & capture</Text><Text style={styles.itemCopy}>Temporary media controls will appear when voice and receipt flows are connected.</Text></GlassSurface><GlassSurface><Text style={styles.itemTitle}>Display preferences</Text><Text style={styles.itemCopy}>USD · English · Light Paper & Ink theme</Text></GlassSurface></LedgerScreen>;
}

const styles = StyleSheet.create({
  eyebrow: { color: Colors.light.action, fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }, title: { color: Colors.light.text, fontSize: 28, fontWeight: '700', lineHeight: 34, marginTop: 4 }, copy: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 }, link: { textDecorationLine: 'none' }, itemTitle: { color: Colors.light.text, fontSize: 16, fontWeight: '700' }, itemCopy: { color: Colors.light.textSecondary, fontSize: 13, lineHeight: 19, marginTop: Spacing.one },
});
