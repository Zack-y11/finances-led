"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type {
  ParsedFinanceCommand,
  ReceiptIntakeResult,
  VoiceIntakeResult,
} from "@finance/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { Textarea } from "@/components/ui/textarea";
import {
  getInputSessions,
  getLedgerOptions,
  parseTextCommand,
  type InputSessionTrace,
  type LedgerOptions,
} from "@/lib/api";

import { CommandProposal } from "./components/command-proposal";
import { ReceiptCapturePanel } from "./components/receipt-capture-panel";
import { VoiceCapturePanel } from "./components/voice-capture-panel";

type CaptureMode = "text" | "voice" | "receipt";

export default function CapturePage() {
  return (
    <Suspense fallback={null}>
      <CapturePageContent />
    </Suspense>
  );
}

function CapturePageContent() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const mode: CaptureMode =
    requestedMode === "voice" || requestedMode === "receipt"
      ? requestedMode
      : "text";
  const modeRef = useRef<CaptureMode>(mode);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedFinanceCommand | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceIntakeResult | null>(
    null,
  );
  const [receiptResult, setReceiptResult] =
    useState<ReceiptIntakeResult | null>(null);
  const [options, setOptions] = useState<LedgerOptions | null>(null);
  const [sessions, setSessions] = useState<InputSessionTrace[]>([]);
  const [captureStateMode, setCaptureStateMode] = useState<CaptureMode>(mode);
  const [sessionsMode, setSessionsMode] = useState<CaptureMode>(mode);

  const refreshSessions = () => {
    const modeAtRequest = mode;
    void getInputSessions()
      .then((data) => {
        if (modeRef.current !== modeAtRequest) return;
        setSessionsMode(modeAtRequest);
        setSessions(
          data.filter((session) =>
            modeAtRequest === "receipt"
              ? session.modality === "image"
              : session.modality === "voice",
          ),
        );
      })
      .catch(() => null);
  };

  useEffect(() => {
    modeRef.current = mode;
    void getLedgerOptions()
      .then((data) => setOptions(data))
      .catch(() => null);
    refreshSessions();
    // Refresh traces when the capture mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setCaptureStateMode("text");
    setError(null);
    setSuccess(null);
    setResult(null);
    setVoiceResult(null);
    setReceiptResult(null);

    try {
      const parsed = await parseTextCommand({ text: text.trim() });
      if (modeRef.current !== "text") return;
      setResult(parsed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse text command",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceParsed = (parsed: VoiceIntakeResult) => {
    if (modeRef.current !== "voice") return;
    setCaptureStateMode("voice");
    setSuccess(null);
    setError(parsed.parseError ?? null);
    setVoiceResult(parsed);
    setResult(parsed.command);
    setReceiptResult(null);
    refreshSessions();
  };

  const handleReceiptParsed = (parsed: ReceiptIntakeResult) => {
    if (modeRef.current !== "receipt") return;
    setCaptureStateMode("receipt");
    setSuccess(null);
    setError(parsed.parseError ?? null);
    setReceiptResult(parsed);
    setVoiceResult(null);
    setResult(parsed.command);
    refreshSessions();
  };

  const mediaResult =
    captureStateMode === mode ? (receiptResult ?? voiceResult) : null;
  const visibleResult = captureStateMode === mode ? result : null;
  const visibleError = captureStateMode === mode ? error : null;
  const visibleSuccess = captureStateMode === mode ? success : null;
  const visibleSessions = sessionsMode === mode ? sessions : [];
  const proposalNote = mediaResult?.transcript ?? text.trim();
  const proposalMethod: CaptureMode = receiptResult
    ? "receipt"
    : voiceResult
      ? "voice"
      : "text";

  return (
    <div className="mx-auto grid max-w-[1000px] gap-6">
      <PageHeading
        eyebrow="Ledger"
        title="Quick capture"
        description="Type, speak, or photograph a financial note in English or Spanish. The backend parses and validates before any ledger write."
      />
      <div className="flex items-center gap-2 rounded-xl border border-action/20 bg-action-soft/40 px-4 py-3 text-sm text-ink">
        <Icon className="size-4 text-action" name="sparkles" />
        <span>
          <strong>Live AI Connected:</strong> Text, voice, and receipts use
          OpenRouter in real time. Raw audio and photos are discarded after
          processing.
        </span>
      </div>
      <div aria-label="Capture mode" className="flex gap-2" role="tablist">
        <Button
          asChild
          size="sm"
          variant={mode === "text" ? "default" : "outline"}
        >
          <Link
            aria-selected={mode === "text"}
            href="/capture"
            onClick={() => {
              modeRef.current = "text";
            }}
            role="tab"
            scroll={false}
          >
            Text command
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={mode === "voice" ? "default" : "outline"}
        >
          <Link
            aria-selected={mode === "voice"}
            href="/capture?mode=voice"
            onClick={() => {
              modeRef.current = "voice";
            }}
            role="tab"
            scroll={false}
          >
            Voice capture
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={mode === "receipt" ? "default" : "outline"}
        >
          <Link
            aria-selected={mode === "receipt"}
            href="/capture?mode=receipt"
            onClick={() => {
              modeRef.current = "receipt";
            }}
            role="tab"
            scroll={false}
          >
            Receipt capture
          </Link>
        </Button>
      </div>
      {mode === "text" ? (
        <Card className="gap-0 overflow-hidden">
          <div className="border-b border-border bg-surface-muted/60 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Icon className="text-action" name="sparkles" />
              Tell Ledger AI what happened
            </div>
          </div>
          <form
            className="grid gap-5 p-5 sm:p-6"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <Textarea
              className="min-h-35 resize-y"
              onChange={(event) => {
                setText(event.target.value);
                setCaptureStateMode("text");
                setError(null);
              }}
              placeholder="e.g. Spent 5.40 at Starbucks with cash"
              value={text}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Try: “Gaste 3.19 en Starbucks con BAC.”
              </p>
              <Button
                disabled={!text.trim() || loading}
                suppressHydrationWarning
                type="submit"
              >
                {loading ? "Parsing with AI…" : "Preview interpretation"}{" "}
                <Icon className="size-4" name="arrow-right" />
              </Button>
            </div>
          </form>
        </Card>
      ) : mode === "voice" ? (
        <VoiceCapturePanel
          disabled={loading}
          onError={(message) => {
            if (modeRef.current !== "voice") return;
            setCaptureStateMode("voice");
            setError(message || null);
          }}
          onParsed={handleVoiceParsed}
        />
      ) : (
        <ReceiptCapturePanel
          disabled={loading}
          onError={(message) => {
            if (modeRef.current !== "receipt") return;
            setCaptureStateMode("receipt");
            setError(message || null);
          }}
          onParsed={handleReceiptParsed}
          onSelectionChange={() => {
            setCaptureStateMode("receipt");
            setSuccess(null);
            setError(null);
            setResult(null);
            setVoiceResult(null);
            setReceiptResult(null);
          }}
        />
      )}
      {mediaResult ? (
        <Card className="border-success/40 bg-success-soft/20 p-5 sm:p-6">
          <p className="font-semibold text-ink">
            {receiptResult
              ? "Photo discarded after extraction"
              : "Audio discarded after transcription"}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {receiptResult ? "Extracted" : "Transcript"}: “
            {mediaResult.transcript}”. Session{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">
              {mediaResult.inputSessionId.slice(0, 8)}
            </code>{" "}
            stores the hash and deletion timestamp only.
          </p>
        </Card>
      ) : null}
      {visibleError ? (
        <Card className="border-danger/30 p-5 sm:p-6">
          <div className="flex items-start gap-3 text-danger">
            <Icon className="size-5 shrink-0" name="shield" />
            <div>
              <p className="font-semibold text-ink">Capture error</p>
              <p className="mt-1 text-sm text-muted">{visibleError}</p>
            </div>
          </div>
        </Card>
      ) : null}
      {visibleSuccess ? (
        <Card className="border-success/40 bg-success-soft/20 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white">
                ✓
              </span>
              <p className="font-semibold text-ink">{visibleSuccess}</p>
            </div>
            <Button asChild size="sm">
              <Link href="/ledger">View in Ledger →</Link>
            </Button>
          </div>
        </Card>
      ) : null}
      {visibleResult ? (
        <CommandProposal
          inputMethod={proposalMethod}
          inputSessionId={mediaResult?.inputSessionId}
          key={mediaResult?.inputSessionId ?? proposalNote}
          note={proposalNote}
          onDiscard={() => {
            if (modeRef.current !== mode) return;
            setCaptureStateMode(mode);
            setResult(null);
            setVoiceResult(null);
            setReceiptResult(null);
          }}
          onSaved={(message) => {
            if (modeRef.current !== mode) return;
            setCaptureStateMode(mode);
            setSuccess(message);
            setResult(null);
            setVoiceResult(null);
            setReceiptResult(null);
            setText("");
            refreshSessions();
          }}
          options={options}
          result={visibleResult}
        />
      ) : null}
      {visibleSessions.length && mode !== "text" ? (
        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold text-ink">
            {mode === "receipt"
              ? "Recent receipt traces"
              : "Recent voice traces"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            These records prove capture happened without keeping the{" "}
            {mode === "receipt" ? "photo" : "audio"}.
          </p>
          <div className="mt-4 grid gap-3">
            {visibleSessions.slice(0, 5).map((session) => (
              <div
                className="rounded-xl border border-border bg-surface-muted/70 px-4 py-3"
                key={session.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {session.transcriptText || "No extracted facts"}
                  </p>
                  <span className="text-xs font-semibold text-success">
                    {session.mediaDeletedAt
                      ? mode === "receipt"
                        ? "Photo deleted"
                        : "Audio deleted"
                      : "No media stored"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {session.status} · {session.mediaMimeType ?? "no mime"} · hash{" "}
                  {session.mediaHash?.slice(0, 12) ?? "none"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-3">
        <CaptureCard
          copy="Use the live Ledger form when precision matters."
          icon="ledger"
          title="Manual entry"
        />
        <CaptureCard
          copy="Type a command, speak it, or photograph a receipt. The parser never writes the ledger."
          icon="sparkles"
          title="Text, voice, and receipts"
        />
        <CaptureCard
          copy="Raw audio and receipt photos are hashed and discarded immediately."
          icon="shield"
          title="Private capture"
        />
      </section>
    </div>
  );
}

function CaptureCard({
  icon,
  title,
  copy,
}: {
  icon: "ledger" | "sparkles" | "shield";
  title: string;
  copy: string;
}) {
  return (
    <Card className="p-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-action-soft text-action">
        <Icon className="size-4" name={icon} />
      </span>
      <h2 className="mt-4 font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-muted">{copy}</p>
    </Card>
  );
}
