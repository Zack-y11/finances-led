import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { deleteAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import {
  canCreateFromParsedCommand,
  ledgerStatusForConfidence,
} from '@finance/contracts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LedgerScreen } from '@/components/ui/ledger-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import {
  ApiError,
  createLedgerEntry,
  getLedgerOptions,
  matchOptionId,
  parseReceiptCommand,
  type ReceiptIntakeResult,
} from '@/lib/api';

type CapturePhase = 'idle' | 'ready' | 'processing';

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

export default function ReceiptCaptureScreen() {
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [result, setResult] = useState<ReceiptIntakeResult | null>(null);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [account, setAccount] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const applyProposal = (parsed: ReceiptIntakeResult) => {
    setResult(parsed);
    setMerchant(parsed.command?.data.merchant ?? '');
    setAmount(
      parsed.command ? String(parsed.command.data.amount) : '',
    );
    setOccurredAt(parsed.command?.data.occurredAt ?? '');
    setAccount(parsed.command?.data.account ?? '');
    setCategory(parsed.command?.data.category ?? '');
  };

  const deleteLocalImage = async (uri: string): Promise<boolean> => {
    try {
      await deleteAsync(uri, { idempotent: true });
      return true;
    } catch {
      return false;
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    setError(null);
    setStatus(null);
    setResult(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Camera permission is required to photograph a receipt.'
          : 'Photo library permission is required to choose a receipt.',
      );
      return;
    }

    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
          });
    if (picked.canceled || !picked.assets[0]) return;

    const asset = picked.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const name =
      asset.fileName ||
      `receipt-capture.${mimeType.includes('png') ? 'png' : 'jpg'}`;
    setImage({
      uri: asset.uri,
      name,
      type: mimeType,
    });
    setPhase('ready');
  };

  const extract = async () => {
    if (!image) return;
    setPhase('processing');
    setError(null);
    setStatus(null);
    try {
      const parsed = await parseReceiptCommand(image, image.name);
      const localImageDeleted = await deleteLocalImage(image.uri);
      if (!localImageDeleted) {
        setError(
          'Extraction succeeded, but the local photo could not be deleted. Tap retry to try again.',
        );
        setPhase('ready');
        return;
      }
      setImage(null);
      applyProposal(parsed);
      setStatus('Local photo deleted after extraction.');
      setPhase('idle');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Receipt capture failed',
      );
      setPhase('ready');
    }
  };

  const saveProposal = async () => {
    if (!result?.command || saving) return;
    if (!canCreateFromParsedCommand(result.command.confidence)) {
      setError('Confidence is too low to create a ledger entry.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a positive amount before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const options = await getLedgerOptions();
      const accountId = matchOptionId(options.accounts, account);
      const categoryId = matchOptionId(options.categories, category);
      if (!accountId || !categoryId) {
        const unmatched = [
          !accountId ? `account “${account}”` : null,
          !categoryId ? `category “${category}”` : null,
        ].filter((value): value is string => value !== null);
        throw new Error(
          `Could not match the suggested ${unmatched.join(' or ')}. Add or rename it in Settings, then try saving again.`,
        );
      }
      const dateStr = occurredAt || new Date().toISOString().slice(0, 10);
      const entryStatus = ledgerStatusForConfidence(result.command.confidence);
      await createLedgerEntry({
        type: result.command.data.type,
        amount: parsedAmount,
        currency: result.command.data.currency || 'USD',
        merchant: merchant.trim() || undefined,
        accountId,
        categoryId,
        occurredAt: `${dateStr}T12:00:00.000Z`,
        note: result.transcript,
        inputMethod: 'receipt',
        confidence: result.command.confidence,
        status: entryStatus,
        inputSessionId: result.inputSessionId,
      });
      setStatus(
        entryStatus === 'needs_review'
          ? 'Saved to the review inbox. Open Review to confirm.'
          : 'Posted to your ledger. Raw photo was not kept.',
      );
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerScreen>
      <ScreenHeader
        eyebrow="RECEIPT CAPTURE"
        title="Photograph it, then forget the photo."
        copy="Capture a receipt in app cache, extract the total and merchant, then delete the local image. Only the extracted facts and parse payload are stored."
      />
      <GlassSurface className="gap-3.5">
        {image ? (
          <Image
            className="border-border bg-background h-[300px] w-full rounded-xl border"
            contentFit="contain"
            source={{ uri: image.uri }}
          />
        ) : (
          <View className="border-border bg-background h-[180px] items-center justify-center rounded-xl border border-dashed">
            <Text className="text-action text-[42px]">⌁</Text>
            <Text className="text-muted-foreground mt-2.5 text-sm">
              {phase === 'processing'
                ? 'Extracting totals and deleting the photo…'
                : 'No receipt selected'}
            </Text>
          </View>
        )}
        <Text className="text-foreground text-center text-base font-bold">
          {phase === 'processing'
            ? 'Analyzing receipt'
            : image
              ? 'Photo ready. Extract to discard it.'
              : 'Ready to capture'}
        </Text>
        <Text className="text-muted-foreground text-center text-[13px] leading-[19px]">
          Receipt photos are never stored as a durable financial record.
        </Text>
        {image ? (
          <View className="flex-row gap-2.5">
            <Button
              className="flex-1"
              disabled={phase === 'processing'}
              onPress={() => {
                if (image) void deleteLocalImage(image.uri);
                setImage(null);
                setPhase('idle');
              }}
              variant="outline"
            >
              <Text>Retake</Text>
            </Button>
            <Button
              className="flex-1"
              disabled={phase === 'processing'}
              onPress={() => void extract()}
            >
              <Text>
                {phase === 'processing'
                  ? 'Working…'
                  : 'Extract and discard photo'}
              </Text>
            </Button>
          </View>
        ) : (
          <View className="flex-row gap-2.5">
            <Button
              className="flex-1"
              onPress={() => void pickImage('camera')}
            >
              <Text>Take photo</Text>
            </Button>
            <Button
              className="flex-1"
              onPress={() => void pickImage('library')}
              variant="outline"
            >
              <Text>Choose photo</Text>
            </Button>
          </View>
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
        <GlassSurface className="gap-3">
          <View className="bg-success-soft rounded-xl p-4">
            <Text className="text-foreground text-sm font-bold">
              Privacy secured
            </Text>
            <Text className="text-muted-foreground mt-1 text-xs leading-[18px]">
              The original receipt image was deleted. Correct the extracted
              facts below before posting or sending to review.
            </Text>
          </View>
          <Badge variant="success" className="self-end">
            <Text>
              {(result.command.confidence * 100).toFixed(0)}% MATCH
            </Text>
          </Badge>
          <Field
            label="Merchant"
            onChangeText={setMerchant}
            value={merchant}
          />
          <View className="flex-row gap-3.5">
            <Field
              half
              keyboardType="decimal-pad"
              label="Total amount"
              onChangeText={setAmount}
              value={amount}
            />
            <Field
              half
              label="Date"
              onChangeText={setOccurredAt}
              value={occurredAt}
            />
          </View>
          <Field
            label="Suggested category"
            onChangeText={setCategory}
            value={category}
          />
          <Field
            label="Account"
            onChangeText={setAccount}
            value={account}
          />
          <Button
            className="bg-foreground mt-2"
            disabled={
              saving ||
              !canCreateFromParsedCommand(result.command.confidence)
            }
            onPress={() => void saveProposal()}
          >
            <Text>
              {saving
                ? 'Saving…'
                : ledgerStatusForConfidence(result.command.confidence) ===
                    'needs_review'
                  ? 'Send to review inbox'
                  : 'Confirm & save transaction'}
            </Text>
          </Button>
          <Button
            className="mt-1"
            onPress={() => setResult(null)}
            variant="ghost"
          >
            <Text className="text-muted-foreground">Discard</Text>
          </Button>
        </GlassSurface>
      ) : null}
    </LedgerScreen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  half,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  half?: boolean;
  keyboardType?: 'decimal-pad';
}) {
  return (
    <View className={half ? 'flex-1' : undefined}>
      <Label>{label}</Label>
      <Input
        className="mt-1.5"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        value={value}
      />
    </View>
  );
}
