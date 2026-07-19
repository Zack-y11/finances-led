import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { Colors, Fonts } from '@/constants/theme';

export default function VoiceCaptureScreen() {
  return <LedgerScreen contentStyle={styles.content}><View><Text style={styles.eyebrow}>VOICE CAPTURE</Text><Text style={styles.title}>Say it in the moment.</Text><Text style={styles.copy}>This component is ready for microphone permission and temporary-media lifecycle integration.</Text></View><GlassSurface style={styles.center}><View style={styles.orb}><Text style={styles.mic}>●</Text></View><Text style={styles.ready}>Ready when your capture service is connected</Text><Text style={styles.helper}>Voice is never stored as a durable financial record.</Text><Pressable style={styles.disabled}><Text style={styles.buttonText}>Start recording</Text></Pressable></GlassSurface></LedgerScreen>;
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' }, eyebrow: { color: Colors.light.action, fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }, title: { color: Colors.light.text, fontSize: 28, fontWeight: '700', lineHeight: 34, marginTop: 4 }, copy: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 }, center: { alignItems: 'center', minHeight: 360, justifyContent: 'center' }, orb: { alignItems: 'center', backgroundColor: Colors.light.actionSoft, borderRadius: 999, height: 100, justifyContent: 'center', width: 100 }, mic: { color: Colors.light.action, fontSize: 36 }, ready: { color: Colors.light.text, fontSize: 16, fontWeight: '700', marginTop: 28, textAlign: 'center' }, helper: { color: Colors.light.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' }, disabled: { backgroundColor: Colors.light.action, borderRadius: 8, marginTop: 24, opacity: 0.5, paddingHorizontal: 18, paddingVertical: 12 }, buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
