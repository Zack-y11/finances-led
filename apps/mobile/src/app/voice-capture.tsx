import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { deleteAsync } from "expo-file-system/legacy";

import {
  canCreateFromParsedCommand,
  ledgerStatusForConfidence,
} from "@finance/contracts";

import { GlassSurface } from "@/components/ui/glass-surface";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import {
  ApiError,
  createLedgerEntry,
  getLedgerOptions,
  matchOptionId,
  parseVoiceCommand,
  type VoiceIntakeResult,
} from "@/lib/api";

type CapturePhase = "idle" | "ready" | "processing";

export default function VoiceCaptureScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [clipUri, setClipUri] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceIntakeResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required to record a voice note.");
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    })();
  }, []);

  const startRecording = async () => {
    setError(null);
    setStatus(null);
    setResult(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase("idle");
  };

  const stopRecording = async () => {
    await recorder.stop();
    if (!recorder.uri) {
      setError("The recorder did not produce an audio file.");
      return;
    }
    setClipUri(recorder.uri);
    setPhase("ready");
  };

  const deleteLocalClip = async (uri: string) => {
    try {
      await deleteAsync(uri, { idempotent: true });
    } catch {
      // Best-effort. The API never persists the bytes.
    }
  };

  const transcribe = async () => {
    if (!clipUri) return;
    setPhase("processing");
    setError(null);
    try {
      const filename = clipUri.toLowerCase().includes(".wav")
        ? "voice-capture.wav"
        : clipUri.toLowerCase().includes(".webm")
          ? "voice-capture.webm"
          : "voice-capture.m4a";
      const mimeType = filename.endsWith(".wav")
        ? "audio/wav"
        : filename.endsWith(".webm")
          ? "audio/webm"
          : "audio/mp4";
      const parsed = await parseVoiceCommand(
        { uri: clipUri, name: filename, type: mimeType },
        filename,
      );
      await deleteLocalClip(clipUri);
      setClipUri(null);
      setResult(parsed);
      setStatus("Local audio deleted after transcription.");
      setPhase("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Voice capture failed");
      setPhase("ready");
    }
  };

  const saveProposal = async () => {
    if (!result?.command || saving) return;
    if (!canCreateFromParsedCommand(result.command.confidence)) {
      setError("Confidence is too low to create a ledger entry.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const options = await getLedgerOptions();
      const accountId = matchOptionId(
        options.accounts,
        result.command.data.account,
      );
      const categoryId = matchOptionId(
        options.categories,
        result.command.data.category,
      );
      if (!accountId || !categoryId) {
        throw new Error("Add an account and category before saving.");
      }
      const dateStr =
        result.command.data.occurredAt ||
        new Date().toISOString().slice(0, 10);
      const entryStatus = ledgerStatusForConfidence(result.command.confidence);
      await createLedgerEntry({
        type: result.command.data.type,
        amount: result.command.data.amount,
        currency: result.command.data.currency || "USD",
        merchant: result.command.data.merchant,
        accountId,
        categoryId,
        occurredAt: `${dateStr}T12:00:00.000Z`,
        note: result.transcript,
        inputMethod: "voice",
        confidence: result.command.confidence,
        status: entryStatus,
        inputSessionId: result.inputSessionId,
      });
      setStatus(
        entryStatus === "needs_review"
          ? "Saved to the review inbox. Open Review to confirm."
          : "Posted to your ledger. Raw audio was not kept.",
      );
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerScreen contentStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>VOICE CAPTURE</Text>
        <Text style={styles.title}>Say it in the moment.</Text>
        <Text style={styles.copy}>
          Record a short note in app cache, transcribe it, then delete the
          local clip. Only the transcript and parse payload are stored.
        </Text>
      </View>
      <GlassSurface style={styles.center}>
        <View style={styles.orb}>
          <Text style={styles.mic}>
            {recorderState.isRecording ? "◉" : "●"}
          </Text>
        </View>
        <Text style={styles.ready}>
          {recorderState.isRecording
            ? "Listening…"
            : phase === "processing"
              ? "Transcribing and deleting audio…"
              : clipUri
                ? "Clip ready. Transcribe to discard it."
                : "Ready when you are"}
        </Text>
        <Text style={styles.helper}>
          Voice is never stored as a durable financial record.
        </Text>
        {recorderState.isRecording ? (
          <Pressable onPress={() => void stopRecording()} style={styles.button}>
            <Text style={styles.buttonText}>Stop recording</Text>
          </Pressable>
        ) : clipUri ? (
          <Pressable
            disabled={phase === "processing"}
            onPress={() => void transcribe()}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {phase === "processing"
                ? "Working…"
                : "Transcribe and discard audio"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void startRecording()}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Start recording</Text>
          </Pressable>
        )}
      </GlassSurface>
      {error ? (
        <GlassSurface>
          <Text style={styles.error}>{error}</Text>
        </GlassSurface>
      ) : null}
      {status ? (
        <GlassSurface>
          <Text style={styles.status}>{status}</Text>
        </GlassSurface>
      ) : null}
      {result?.command ? (
        <GlassSurface>
          <Text style={styles.proposalLabel}>PROPOSAL</Text>
          <Text style={styles.proposalTitle}>
            {result.command.data.merchant ?? result.command.data.category} · $
            {result.command.data.amount.toFixed(2)}
          </Text>
          <Text style={styles.proposalCopy}>
            {result.transcript} ·{" "}
            {(result.command.confidence * 100).toFixed(0)}% confidence
            {result.mediaDeleted ? " · audio deleted" : ""}
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => setResult(null)}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Discard</Text>
            </Pressable>
            <Pressable
              disabled={
                saving ||
                !canCreateFromParsedCommand(result.command.confidence)
              }
              onPress={() => void saveProposal()}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {saving ? "Saving…" : "Save entry"}
              </Text>
            </Pressable>
          </View>
        </GlassSurface>
      ) : null}
    </LedgerScreen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: "center" },
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
  center: { alignItems: "center", minHeight: 320, justifyContent: "center" },
  orb: {
    alignItems: "center",
    backgroundColor: Colors.light.actionSoft,
    borderRadius: 999,
    height: 100,
    justifyContent: "center",
    width: 100,
  },
  mic: { color: Colors.light.action, fontSize: 36 },
  ready: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 28,
    textAlign: "center",
  },
  helper: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: Colors.light.action,
    borderRadius: 8,
    marginTop: 24,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    flex: 1,
  },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  error: { color: Colors.light.danger, fontSize: 14, lineHeight: 20 },
  status: { color: Colors.light.success, fontSize: 14, lineHeight: 20 },
  proposalLabel: {
    color: Colors.light.action,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  proposalTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 7,
  },
  proposalCopy: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },
  actions: { flexDirection: "row", gap: Spacing.two },
  secondary: {
    alignItems: "center",
    borderColor: Colors.light.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
  },
  secondaryText: { color: Colors.light.text, fontSize: 14, fontWeight: "700" },
});
