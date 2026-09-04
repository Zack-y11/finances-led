"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { ParsedFinanceCommand, VoiceIntakeResult } from "@finance/contracts";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import {
  getInputSessions,
  getLedgerOptions,
  parseTextCommand,
  type InputSessionTrace,
  type LedgerOptions,
} from "@/lib/api";

import { CommandProposal } from "./components/command-proposal";
import { VoiceCapturePanel } from "./components/voice-capture-panel";

type CaptureMode = "text" | "voice";

export default function CapturePage() {
  return (
    <Suspense fallback={null}>
      <CapturePageContent />
    </Suspense>
  );
}

function CapturePageContent() {
  const searchParams = useSearchParams();
  const mode: CaptureMode =
    searchParams.get("mode") === "voice" ? "voice" : "text";
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedFinanceCommand | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceIntakeResult | null>(null);
  const [options, setOptions] = useState<LedgerOptions | null>(null);
  const [sessions, setSessions] = useState<InputSessionTrace[]>([]);

  const refreshSessions = () => {
    void getInputSessions()
      .then((data) => setSessions(data.filter((session) => session.modality === "voice")))
      .catch(() => null);
  };

  useEffect(() => {
    void getLedgerOptions()
      .then((data) => setOptions(data))
      .catch(() => null);
    refreshSessions();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    setVoiceResult(null);

    try {
      const parsed = await parseTextCommand({ text: text.trim() });
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
    setSuccess(null);
    setError(parsed.parseError ?? null);
    setVoiceResult(parsed);
    setResult(parsed.command);
    refreshSessions();
  };

  const proposalNote = voiceResult?.transcript ?? text.trim();
  const proposalMethod: CaptureMode = voiceResult ? "voice" : "text";

  return (
    <div className="mx-auto grid max-w-[1000px] gap-6">
      <PageHeading
        eyebrow="Ledger"
        title="Quick capture"
        description="Type or speak a natural financial note in English or Spanish. The backend transcribes, parses, and validates before any ledger write."
      />
      <div className="flex items-center gap-2 text-sm text-ink rounded-xl border border-action/20 bg-action-soft/40 px-4 py-3">
        <Icon className="size-4 text-action" name="sparkles" />
        <span>
          <strong>Live AI Connected:</strong> Text and voice use OpenRouter in
          real time. Raw audio is discarded after transcription.
        </span>
      </div>
      <div
        aria-label="Capture mode"
        className="flex gap-2"
        role="tablist"
      >
        <Link
          aria-selected={mode === "text"}
          className={mode === "text" ? "button-primary" : "button-secondary"}
          href="/capture"
          role="tab"
          scroll={false}
        >
          Text command
        </Link>
        <Link
          aria-selected={mode === "voice"}
          className={mode === "voice" ? "button-primary" : "button-secondary"}
          href="/capture?mode=voice"
          role="tab"
          scroll={false}
        >
          Voice capture
        </Link>
      </div>
      {mode === "text" ? (
        <section className="surface-card overflow-hidden">
          <div className="border-b border-border bg-surface-muted/60 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Icon className="text-action" name="sparkles" />
              Tell Ledger AI what happened
            </div>
          </div>
          <form className="grid gap-5 p-5 sm:p-6" onSubmit={(event) => void handleSubmit(event)}>
            <textarea
              className="field min-h-35 resize-y"
              onChange={(event) => {
                setText(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Spent 5.40 at Starbucks with cash"
              value={text}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Try: “Gaste 3.19 en Starbucks con BAC.”
              </p>
              <button
                className="button-primary"
                disabled={!text.trim() || loading}
                suppressHydrationWarning
                type="submit"
              >
                {loading ? "Parsing with AI…" : "Preview interpretation"}{" "}
                <Icon className="size-4" name="arrow-right" />
              </button>
            </div>
          </form>
        </section>
      ) : (
        <VoiceCapturePanel
          disabled={loading}
          onError={(message) => setError(message || null)}
          onParsed={handleVoiceParsed}
        />
      )}
      {voiceResult ? (
        <section className="surface-card border-success/40 bg-success-soft/20 p-5 sm:p-6">
          <p className="font-semibold text-ink">Audio discarded after transcription</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Transcript: “{voiceResult.transcript}”. Session{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono">
              {voiceResult.inputSessionId.slice(0, 8)}
            </code>{" "}
            stores the hash and deletion timestamp only.
          </p>
        </section>
      ) : null}
      {error ? (
        <section className="surface-card border-danger/30 p-5 sm:p-6">
          <div className="flex items-start gap-3 text-danger">
            <Icon className="size-5 shrink-0" name="shield" />
            <div>
              <p className="font-semibold text-ink">Capture error</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
          </div>
        </section>
      ) : null}
      {success ? (
        <section className="surface-card border-success/40 bg-success-soft/20 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white">
                ✓
              </span>
              <p className="font-semibold text-ink">{success}</p>
            </div>
            <Link className="button-primary text-xs" href="/ledger">
              View in Ledger →
            </Link>
          </div>
        </section>
      ) : null}
      {result ? (
        <CommandProposal
          inputMethod={proposalMethod}
          inputSessionId={voiceResult?.inputSessionId}
          key={voiceResult?.inputSessionId ?? proposalNote}
          note={proposalNote}
          onDiscard={() => {
            setResult(null);
            setVoiceResult(null);
          }}
          onSaved={(message) => {
            setSuccess(message);
            setResult(null);
            setVoiceResult(null);
            setText("");
            refreshSessions();
          }}
          options={options}
          result={result}
        />
      ) : null}
      {sessions.length ? (
        <section className="surface-card p-5 sm:p-6">
          <h2 className="font-semibold text-ink">Recent voice traces</h2>
          <p className="mt-1 text-sm text-muted">
            These records prove capture happened without keeping the audio.
          </p>
          <div className="mt-4 grid gap-3">
            {sessions.slice(0, 5).map((session) => (
              <div
                className="rounded-xl border border-border bg-surface-muted/70 px-4 py-3"
                key={session.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {session.transcriptText || "No transcript"}
                  </p>
                  <span className="text-xs font-semibold text-success">
                    {session.mediaDeletedAt ? "Audio deleted" : "No media stored"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {session.status} · {session.mediaMimeType ?? "no mime"} · hash{" "}
                  {session.mediaHash?.slice(0, 12) ?? "none"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-3">
        <CaptureCard
          copy="Use the live Ledger form when precision matters."
          icon="ledger"
          title="Manual entry"
        />
        <CaptureCard
          copy="Type a command or speak it. The parser never writes the ledger."
          icon="sparkles"
          title="Text and voice"
        />
        <CaptureCard
          copy="Voice audio is transcribed, hashed, and discarded immediately."
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
    <div className="surface-card p-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-action-soft text-action">
        <Icon className="size-4" name={icon} />
      </span>
      <h2 className="mt-4 font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-muted">{copy}</p>
    </div>
  );
}
