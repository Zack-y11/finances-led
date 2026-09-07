"use client";

import { useEffect, useRef, useState } from "react";

import type { VoiceIntakeResult } from "@finance/contracts";
import { Icon } from "@/components/ui/icon";
import { parseVoiceCommand } from "@/lib/api";

type RecorderState = "idle" | "recording" | "ready";

const MAX_RECORDING_MS = 60_000;

export function VoiceCapturePanel({
  disabled,
  onError,
  onParsed,
}: {
  disabled?: boolean;
  onError: (message: string) => void;
  onParsed: (result: VoiceIntakeResult) => void;
}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [clip, setClip] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopTimer();
      stopStream();
    };
  }, []);

  const startRecording = async () => {
    onError("");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onError(
        "This browser cannot record audio. Choose a short audio file instead.",
      );
      return;
    }

    try {
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () => reject(new Error("Microphone access timed out.")),
            8_000,
          ),
        ),
      ]);
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setClip(blob);
        setState("ready");
        stopStream();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setClip(null);
      setElapsedMs(0);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        setElapsedMs((current) => {
          const next = current + 250;
          if (next >= MAX_RECORDING_MS) {
            stopRecording();
          }
          return next;
        });
      }, 250);
    } catch {
      onError("Microphone permission is required to record a voice note.");
      stopStream();
    }
  };

  const stopRecording = () => {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    setState(clip ? "ready" : "idle");
    stopStream();
  };

  const resetClip = () => {
    setClip(null);
    setElapsedMs(0);
    setState("idle");
  };

  const transcribe = async (audio: Blob, filename: string) => {
    setUploading(true);
    onError("");
    try {
      const parsed = await parseVoiceCommand(audio, filename);
      onParsed(parsed);
      resetClip();
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "Failed to transcribe voice capture",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="surface-card overflow-hidden" data-testid="voice-capture-panel">
      <div className="border-b border-border bg-surface-muted/60 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon className="text-action" name="mic" />
          Speak a financial note
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:p-6">
        <p className="text-sm leading-6 text-muted">
          Audio stays in this browser until transcription finishes. The API
          stores only the transcript, parse payload, and a deletion audit —
          never the recording.
        </p>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-action/30 bg-action-soft/20 px-6 py-8">
          <span className="flex size-20 items-center justify-center rounded-full bg-action-soft text-action">
            <Icon className="size-8" name="mic" />
          </span>
          <p className="text-sm font-semibold text-ink">
            {state === "recording"
              ? `Recording… ${formatClock(elapsedMs)}`
              : clip
                ? `Clip ready · ${formatBytes(clip.size)}`
                : "Ready to record"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {state === "recording" ? (
              <button
                className="button-primary"
                disabled={disabled || uploading}
                onClick={stopRecording}
                type="button"
              >
                Stop recording
              </button>
            ) : (
              <button
                className="button-primary"
                disabled={disabled || uploading}
                onClick={() => void startRecording()}
                type="button"
              >
                {clip ? "Re-record" : "Start recording"}
              </button>
            )}
            {clip ? (
              <button
                className="button-primary"
                disabled={disabled || uploading}
                onClick={() =>
                  void transcribe(
                    clip,
                    clip.type.includes("mp4")
                      ? "voice-capture.m4a"
                      : "voice-capture.webm",
                  )
                }
                type="button"
              >
                {uploading ? "Transcribing…" : "Transcribe and discard audio"}
              </button>
            ) : null}
            <button
              className="button-secondary"
              disabled={disabled || uploading || state === "recording"}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Upload audio file
            </button>
          </div>
          <input
            accept="audio/*,video/webm,.webm,.m4a,.mp3,.wav,.ogg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void transcribe(file, file.name);
            }}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </div>
    </section>
  );
}

function formatClock(ms: number): string {
  const total = Math.min(60, Math.floor(ms / 1000));
  return `0:${String(total).padStart(2, "0")}`;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  return `${Math.round(size / 1024)} KB`;
}
