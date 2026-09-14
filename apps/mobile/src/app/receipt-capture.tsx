import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import {
  cacheDirectory,
  copyAsync,
  deleteAsync,
} from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import {
  canCreateFromParsedCommand,
  ledgerStatusForConfidence,
} from "@finance/contracts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LedgerScreen } from "@/components/ui/ledger-screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Text } from "@/components/ui/text";
import {
  ApiError,
  createLedgerEntry,
  getLedgerOptions,
  matchOptionId,
  parseReceiptCommand,
  type ReceiptIntakeResult,
} from "@/lib/api";

type CapturePhase = "idle" | "ready" | "processing" | "deleting";

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const UNSUPPORTED_IMAGE_MESSAGE =
  "Unsupported image type. Use JPEG, PNG, WebP, or GIF.";

function deleteLocalImage(uri: string): Promise<boolean> {
  return deleteAsync(uri, { idempotent: true })
    .then(() => true)
    .catch(() => false);
}

function normalizeImageMimeType(
  mimeType: string | null | undefined,
  uri: string,
  fileName: string | null | undefined,
): string {
  const normalized = (mimeType ?? "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (ALLOWED_IMAGE_MIME_TYPES.has(normalized)) {
    return normalized === "image/jpg" ? "image/jpeg" : normalized;
  }
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }

  const extension = (uri || fileName || "")
    .toLowerCase()
    .split("?")[0]
    .split(".")
    .pop();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return normalized;
  }
}

function isAppCacheUri(uri: string): boolean {
  return Boolean(cacheDirectory && uri.startsWith(cacheDirectory));
}

function createReceiptCacheUri(mimeType: string): string {
  if (!cacheDirectory) {
    throw new Error("Receipt capture storage is unavailable.");
  }
  const extension = IMAGE_EXTENSION_BY_MIME[mimeType] ?? "jpg";
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${cacheDirectory}receipt-capture-${token}.${extension}`;
}

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export default function ReceiptCaptureScreen() {
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [result, setResult] = useState<ReceiptIntakeResult | null>(null);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const imageRef = useRef<PickedImage | null>(null);
  const pendingParsedRef = useRef<ReceiptIntakeResult | null>(null);
  const mountedRef = useRef(true);

  const setCurrentImage = (next: PickedImage | null) => {
    imageRef.current = next;
    setImage(next);
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const uri = imageRef.current?.uri;
      if (uri) void deleteLocalImage(uri);
    };
  }, []);

  const applyProposal = (parsed: ReceiptIntakeResult) => {
    setResult(parsed);
    setMerchant(parsed.command?.data.merchant ?? "");
    setAmount(parsed.command ? String(parsed.command.data.amount) : "");
    setOccurredAt(parsed.command?.data.occurredAt ?? "");
    setAccount(parsed.command?.data.account ?? "");
    setCategory(parsed.command?.data.category ?? "");
    setError(
      parsed.parseError ??
        (parsed.command ? null : "Receipt capture could not be parsed"),
    );
  };

  const pickImage = async (source: "camera" | "library") => {
    if (picking) return;
    setPicking(true);
    setError(null);
    let ownedUri: string | null = null;

    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (!mountedRef.current) return;
        setError(
          source === "camera"
            ? "Camera permission is required to photograph a receipt."
            : "Photo library permission is required to choose a receipt.",
        );
        return;
      }

      const picked =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.7,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.7,
            });
      if (picked.canceled) return;

      const asset = picked.assets?.[0];
      if (!asset) return;

      // Camera results are app-cache files. Library results can refer to a
      // user's original photo, so always copy those into app-owned cache
      // storage before retaining or deleting them.
      if (source === "camera" && isAppCacheUri(asset.uri)) {
        ownedUri = asset.uri;
      }

      const mimeType = normalizeImageMimeType(
        asset.mimeType,
        asset.uri,
        asset.fileName,
      );
      if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        throw new Error(UNSUPPORTED_IMAGE_MESSAGE);
      }
      if (asset.fileSize !== undefined && asset.fileSize > MAX_IMAGE_BYTES) {
        throw new Error("Receipt images must be 8 MB or smaller.");
      }

      const name =
        asset.fileName ||
        `receipt-capture.${IMAGE_EXTENSION_BY_MIME[mimeType] ?? "jpg"}`;
      if (!ownedUri) {
        ownedUri = createReceiptCacheUri(mimeType);
        await copyAsync({ from: asset.uri, to: ownedUri });
      }

      if (!mountedRef.current) {
        await deleteLocalImage(ownedUri);
        return;
      }

      setCurrentImage({
        uri: ownedUri,
        name,
        type: mimeType,
      });
      ownedUri = null;
      pendingParsedRef.current = null;
      setResult(null);
      setStatus(null);
      setPhase("ready");
    } catch (err) {
      if (ownedUri) await deleteLocalImage(ownedUri);
      if (!mountedRef.current) return;
      setError(
        err instanceof Error ? err.message : "Could not prepare receipt photo",
      );
      setPhase(imageRef.current ? "ready" : "idle");
    } finally {
      if (mountedRef.current) setPicking(false);
    }
  };

  const extract = async () => {
    const currentImage = imageRef.current;
    if (!currentImage) return;
    setPhase("processing");
    setError(null);
    setStatus(null);
    try {
      const parsed =
        pendingParsedRef.current ??
        (await parseReceiptCommand(currentImage, currentImage.name));
      pendingParsedRef.current = parsed;
      const localImageDeleted = await deleteLocalImage(currentImage.uri);
      if (!localImageDeleted) {
        setError(
          "Extraction succeeded, but the local photo could not be deleted. Tap retry to try again.",
        );
        setPhase("ready");
        return;
      }
      if (!mountedRef.current) return;
      pendingParsedRef.current = null;
      setCurrentImage(null);
      applyProposal(parsed);
      setStatus(
        parsed.command ? "Local photo deleted after extraction." : null,
      );
      setPhase("idle");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        err instanceof ApiError ? err.message : "Receipt capture failed",
      );
      setPhase("ready");
    }
  };

  const discardImage = async () => {
    const currentImage = imageRef.current;
    if (!currentImage) return;
    setPhase("deleting");
    setError(null);
    const localImageDeleted = await deleteLocalImage(currentImage.uri);
    if (!mountedRef.current) return;
    if (!localImageDeleted) {
      setError(
        "The local photo could not be deleted. It is still on this device; try again.",
      );
      setPhase("ready");
      return;
    }
    pendingParsedRef.current = null;
    setCurrentImage(null);
    setPhase("idle");
  };

  const saveProposal = async () => {
    if (!result?.command || saving) return;
    if (!canCreateFromParsedCommand(result.command.confidence)) {
      setError("Confidence is too low to create a ledger entry.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a positive amount before saving.");
      return;
    }
    const dateStr = occurredAt || new Date().toISOString().slice(0, 10);
    if (!isValidCalendarDate(dateStr)) {
      setError("Enter a valid receipt date in YYYY-MM-DD format.");
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
          `Could not match the suggested ${unmatched.join(" or ")}. Add or rename it in Settings, then try saving again.`,
        );
      }
      const entryStatus = ledgerStatusForConfidence(result.command.confidence);
      await createLedgerEntry({
        type: result.command.data.type,
        amount: parsedAmount,
        currency: result.command.data.currency || "USD",
        merchant: merchant.trim() || undefined,
        accountId,
        categoryId,
        occurredAt: `${dateStr}T12:00:00.000Z`,
        note: result.transcript,
        inputMethod: "receipt",
        confidence: result.command.confidence,
        status: entryStatus,
        inputSessionId: result.inputSessionId,
      });
      setStatus(
        entryStatus === "needs_review"
          ? "Saved to the review inbox. Open Review to confirm."
          : "Posted to your ledger. Raw photo was not kept.",
      );
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
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
              {phase === "processing"
                ? "Extracting totals and deleting the photo…"
                : phase === "deleting"
                  ? "Deleting the local photo…"
                  : "No receipt selected"}
            </Text>
          </View>
        )}
        <Text className="text-foreground text-center text-base font-bold">
          {phase === "processing"
            ? "Analyzing receipt"
            : phase === "deleting"
              ? "Deleting photo"
              : image
                ? "Photo ready. Extract to discard it."
                : "Ready to capture"}
        </Text>
        <Text className="text-muted-foreground text-center text-[13px] leading-[19px]">
          Receipt photos are never stored as a durable financial record.
        </Text>
        {image ? (
          <View className="flex-row gap-2.5">
            <Button
              className="flex-1"
              disabled={phase === "processing" || phase === "deleting"}
              onPress={() => void discardImage()}
              variant="outline"
            >
              <Text>Discard and retake</Text>
            </Button>
            <Button
              className="flex-1"
              disabled={phase === "processing" || phase === "deleting"}
              onPress={() => void extract()}
            >
              <Text>
                {phase === "processing"
                  ? "Working…"
                  : phase === "deleting"
                    ? "Deleting…"
                    : "Extract and discard photo"}
              </Text>
            </Button>
          </View>
        ) : (
          <View className="flex-row gap-2.5">
            <Button
              className="flex-1"
              disabled={picking}
              onPress={() => void pickImage("camera")}
            >
              <Text>Take photo</Text>
            </Button>
            <Button
              className="flex-1"
              disabled={picking}
              onPress={() => void pickImage("library")}
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
            <Text>{(result.command.confidence * 100).toFixed(0)}% MATCH</Text>
          </Badge>
          <Field label="Merchant" onChangeText={setMerchant} value={merchant} />
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
          <Field label="Account" onChangeText={setAccount} value={account} />
          <Button
            className="bg-foreground mt-2"
            disabled={
              saving || !canCreateFromParsedCommand(result.command.confidence)
            }
            onPress={() => void saveProposal()}
          >
            <Text>
              {saving
                ? "Saving…"
                : ledgerStatusForConfidence(result.command.confidence) ===
                    "needs_review"
                  ? "Send to review inbox"
                  : "Confirm & save transaction"}
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
  keyboardType?: "decimal-pad";
}) {
  return (
    <View className={half ? "flex-1" : undefined}>
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
