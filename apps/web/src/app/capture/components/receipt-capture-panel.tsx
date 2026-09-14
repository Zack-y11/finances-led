"use client";

import { useEffect, useRef, useState } from "react";

import type { ReceiptIntakeResult } from "@finance/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { parseReceiptCommand } from "@/lib/api";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

export function ReceiptCapturePanel({
  disabled,
  onError,
  onParsed,
  onSelectionChange,
}: {
  disabled?: boolean;
  onError: (message: string) => void;
  onParsed: (result: ReceiptIntakeResult) => void;
  onSelectionChange?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const resetSelection = () => {
    onSelectionChange?.();
    revokePreview();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectFile = (next: File) => {
    onSelectionChange?.();
    onError("");
    revokePreview();
    const objectUrl = URL.createObjectURL(next);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setFile(next);
  };

  const extract = async () => {
    if (!file) return;
    setUploading(true);
    onError("");
    try {
      const parsed = await parseReceiptCommand(file, file.name);
      resetSelection();
      onParsed(parsed);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to parse receipt capture",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="gap-0 overflow-hidden" data-testid="receipt-capture-panel">
      <div className="border-b border-border bg-surface-muted/60 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon className="text-action" name="camera" />
          Photograph a receipt
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:p-6">
        <p className="text-sm leading-6 text-muted">
          The photo stays in this browser until extraction finishes. The API
          stores only the extracted facts, parse payload, and a deletion audit —
          never the image.
        </p>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-action/30 bg-action-soft/20 px-6 py-8">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Receipt preview"
              className="max-h-56 w-full rounded-xl object-contain"
              src={previewUrl}
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-action-soft text-action">
              <Icon className="size-8" name="camera" />
            </span>
          )}
          <p className="text-sm font-semibold text-ink">
            {uploading
              ? "Extracting totals and deleting the photo…"
              : file
                ? `Photo ready · ${file.name}`
                : "Ready to capture"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant={file ? "outline" : "default"}
            >
              {file ? "Choose another photo" : "Upload receipt photo"}
            </Button>
            {file ? (
              <Button
                disabled={disabled || uploading}
                onClick={() => void extract()}
                type="button"
              >
                {uploading ? "Working…" : "Extract and discard photo"}
              </Button>
            ) : null}
            {file && !uploading ? (
              <Button onClick={resetSelection} type="button" variant="ghost">
                Discard photo
              </Button>
            ) : null}
          </div>
          <input
            accept={ACCEPT}
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const next = event.target.files?.[0];
              event.target.value = "";
              if (next) selectFile(next);
            }}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </div>
    </Card>
  );
}
