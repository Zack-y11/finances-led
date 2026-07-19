import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function CaptureScreen() {
  const [note, setNote] = useState('');
  const [showProposal, setShowProposal] = useState(false);
  return <LedgerScreen><View><Text style={styles.eyebrow}>QUICK CAPTURE</Text><Text style={styles.title}>Capture it while it is fresh.</Text><Text style={styles.copy}>Turn a short note into a reviewable ledger proposal.</Text></View><GlassSurface><Text style={styles.label}>WHAT HAPPENED?</Text><TextInput multiline onChangeText={(value) => { setNote(value); setShowProposal(false); }} placeholder="e.g. Gaste 3.19 en Starbucks con BAC" placeholderTextColor={Colors.light.textSecondary} style={styles.input} value={note} /><Pressable disabled={!note.trim()} onPress={() => setShowProposal(true)} style={[styles.button, !note.trim() && styles.disabled]}><Text style={styles.buttonText}>Interpret entry →</Text></Pressable></GlassSurface>{showProposal ? <GlassSurface><Text style={styles.proposalLabel}>PROPOSAL PREVIEW</Text><Text style={styles.proposalTitle}>Dining expense · $3.19</Text><Text style={styles.proposalCopy}>BAC Checking · Today · needs confirmation</Text><View style={styles.actions}><Pressable style={styles.secondary}><Text style={styles.secondaryText}>Edit</Text></Pressable><Pressable style={styles.button}><Text style={styles.buttonText}>Approve</Text></Pressable></View></GlassSurface> : null}<GlassSurface><Text style={styles.sectionTitle}>Capture modes</Text><Text style={styles.copy}>Voice and receipt capture components stay unavailable until their privacy lifecycle is connected.</Text></GlassSurface></LedgerScreen>;
}

const styles = StyleSheet.create({
  eyebrow: { color: Colors.light.action, fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: Colors.light.text, fontSize: 28, fontWeight: '700', lineHeight: 34, marginTop: 4 },
  copy: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  label: { color: Colors.light.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  input: { backgroundColor: Colors.light.background, borderColor: Colors.light.border, borderWidth: 1, borderRadius: 8, color: Colors.light.text, fontSize: 15, lineHeight: 21, marginTop: 8, minHeight: 120, padding: 12, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: Colors.light.action, borderRadius: 8, marginTop: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  proposalLabel: { color: Colors.light.action, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  proposalTitle: { color: Colors.light.text, fontSize: 18, fontWeight: '700', marginTop: 7 },
  proposalCopy: { color: Colors.light.textSecondary, fontSize: 13, marginTop: 5 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  secondary: { alignItems: 'center', borderColor: Colors.light.border, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: 'center', marginTop: 12, minHeight: 44 },
  secondaryText: { color: Colors.light.text, fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: Colors.light.text, fontSize: 17, fontWeight: '700' },
});
