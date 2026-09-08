import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { deleteAsync } from 'expo-file-system/legacy';

import {
  canCreateFromParsedCommand,
  ledgerStatusForConfidence,
} from '@finance/contracts';

import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import {
  ApiError,
  createLedgerEntry,
  getLedgerOptions,
  matchOptionId,
  parseVoiceCommand,
  type VoiceIntakeResult,
} from '@/lib/api';

type CapturePhase = 'idle' | 'ready' | 'processing';

export default function VoiceCaptureScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [clipUri, setClipUri] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceIntakeResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required to record a voice note.');
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
    setPhase('idle');
  };

  const stopRecording = async () => {
    await recorder.stop();
    if (!recorder.uri) {
      setError('The recorder did not produce an audio file.');
      return;
    }
    setClipUri(recorder.uri);
    setPhase('ready');
  };

  const deleteLocalClip = async (uri: string): Promise<boolean> => {
    try {
      await deleteAsync(uri, { idempotent: true });
      return true;
    } catch {
      return false;
    }
  };

  const transcribe = async () => {
    if (!clipUri) return;
    setPhase('processing');
    setError(null);
    setStatus(null);
    try {
      const filename = clipUri.toLowerCase().includes('.wav')
        ? 'voice-capture.wav'
        : clipUri.toLowerCase().includes('.webm')
          ? 'voice-capture.webm'
          : 'voice-capture.m4a';
      const mimeType = filename.endsWith('.wav')
        ? 'audio/wav'
        : filename.endsWith('.webm')
          ? 'audio/webm'
          : 'audio/mp4';
      const parsed = await parseVoiceCommand(
        { uri: clipUri, name: filename, type: mimeType },
        filename,
      );
      const localClipDeleted = await deleteLocalClip(clipUri);
      if (!localClipDeleted) {
        setError(
          'Transcription succeeded, but the local audio could not be deleted. Tap retry to try again.',
        );
        setPhase('ready');
        return;
      }
      setClipUri(null);
      setResult(parsed);
      setStatus('Local audio deleted after transcription.');
      setPhase('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Voice capture failed');
      setPhase('ready');
    }
  };

  const saveProposal = async () => {
    if (!result?.command || saving) return;
    if (!canCreateFromParsedCommand(result.command.confidence)) {
      setError('Confidence is too low to create a ledger entry.');
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
        const unmatched = [
          !accountId ? `account “${result.command.data.account}”` : null,
          !categoryId ? `category “${result.command.data.category}”` : null,
        ].filter((value): value is string => value !== null);
        throw new Error(
          `Could not match the suggested ${unmatched.join(' or ')}. Add or rename it in Settings, then try saving again.`,
        );
      }
      const dateStr =
        result.command.data.occurredAt ||
        new Date().toISOString().slice(0, 10);
      const entryStatus = ledgerStatusForConfidence(result.command.confidence);
      await createLedgerEntry({
        type: result.command.data.type,
        amount: result.command.data.amount,
        currency: result.command.data.currency || 'USD',
        merchant: result.command.data.merchant,
        accountId,
        categoryId,
        occurredAt: `${dateStr}T12:00:00.000Z`,
        note: result.transcript,
        inputMethod: 'voice',
        confidence: result.command.confidence,
        status: entryStatus,
        inputSessionId: result.inputSessionId,
      });
      setStatus(
        entryStatus === 'needs_review'
          ? 'Saved to the review inbox. Open Review to confirm.'
          : 'Posted to your ledger. Raw audio was not kept.',
      );
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerScreen contentStyle={{ justifyContent: 'center' }}>
      <ScreenHeader
        eyebrow="VOICE CAPTURE"
        title="Say it in the moment."
        copy="Record a short note in app cache, transcribe it, then delete the local clip. Only the transcript and parse payload are stored."
      />
      <GlassSurface className="min-h-[360px] items-center justify-center">
        <View className="bg-action-soft h-[100px] w-[100px] items-center justify-center rounded-full">
          <Text className="text-action text-4xl">
            {recorderState.isRecording ? '◉' : '●'}
          </Text>
        </View>
        <Text className="text-foreground mt-7 text-center text-base font-bold">
          {recorderState.isRecording
            ? 'Listening…'
            : phase === 'processing'
              ? 'Transcribing and deleting audio…'
              : clipUri
                ? 'Clip ready. Transcribe to discard it.'
                : 'Ready when you are'}
        </Text>
        <Text className="text-muted-foreground mt-2 text-center text-[13px] leading-[19px]">
          Voice is never stored as a durable financial record.
        </Text>
        {recorderState.isRecording ? (
          <Button className="mt-6" onPress={() => void stopRecording()}>
            <Text>Stop recording</Text>
          </Button>
        ) : clipUri ? (
          <Button
            className="mt-6"
            disabled={phase === 'processing'}
            onPress={() => void transcribe()}
          >
            <Text>
              {phase === 'processing'
                ? 'Working…'
                : 'Transcribe and discard audio'}
            </Text>
          </Button>
        ) : (
          <Button className="mt-6" onPress={() => void startRecording()}>
            <Text>Start recording</Text>
          </Button>
        )}
      </GlassSurface>
      {error ? (
        <GlassSurface>
          <Text className="text-danger text-sm leading-5">{error}</Text>
        </GlassSurface>
      ) : null}
      {status ? (
        <GlassSurface>
          <Text className="text-success text-sm leading-5">{status}</Text>
        </GlassSurface>
      ) : null}
      {result?.command ? (
        <GlassSurface>
          <Text className="text-action text-[11px] font-bold tracking-wider">
            PROPOSAL
          </Text>
          <Text className="text-foreground mt-2 text-lg font-bold">
            {result.command.data.merchant ?? result.command.data.category} · $
            {result.command.data.amount.toFixed(2)}
          </Text>
          <Text className="text-muted-foreground mt-1 text-[13px]">
            {result.transcript} ·{' '}
            {(result.command.confidence * 100).toFixed(0)}% confidence
            {result.mediaDeleted ? ' · audio deleted' : ''}
          </Text>
          <View className="mt-3 flex-row gap-2">
            <Button
              className="flex-1"
              onPress={() => setResult(null)}
              variant="outline"
            >
              <Text>Discard</Text>
            </Button>
            <Button
              className="flex-1"
              disabled={
                saving || !canCreateFromParsedCommand(result.command.confidence)
              }
              onPress={() => void saveProposal()}
            >
              <Text>{saving ? 'Saving…' : 'Save entry'}</Text>
            </Button>
          </View>
        </GlassSurface>
      ) : null}
    </LedgerScreen>
  );
}
