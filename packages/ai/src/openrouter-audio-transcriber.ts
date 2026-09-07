import type {
  AudioTranscriber,
  AudioTranscriptionInput,
} from "./audio-transcriber.js";
import {
  audioFormatFromMimeOrFilename,
  buildOpenRouterHeaders,
  OPENROUTER_BASE_URL,
  OPENROUTER_DEFAULT_APP_TITLE,
  OPENROUTER_DEFAULT_HTTP_REFERER,
  OPENROUTER_DEFAULT_TRANSCRIBE_MODEL,
} from "./openrouter.js";

type TranscriptionResponse = {
  text?: string;
};

export type OpenRouterAudioTranscriberOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  httpReferer?: string;
  appTitle?: string;
};

export class OpenRouterAudioTranscriber implements AudioTranscriber {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly httpReferer: string;
  private readonly appTitle: string;

  constructor(options: OpenRouterAudioTranscriberOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? OPENROUTER_DEFAULT_TRANSCRIBE_MODEL;
    this.baseUrl = options.baseUrl ?? OPENROUTER_BASE_URL;
    this.httpReferer = options.httpReferer ?? OPENROUTER_DEFAULT_HTTP_REFERER;
    this.appTitle = options.appTitle ?? OPENROUTER_DEFAULT_APP_TITLE;
  }

  async transcribeAudio(input: AudioTranscriptionInput): Promise<string> {
    const copy = Buffer.from(input.audio);
    const format = audioFormatFromMimeOrFilename(
      input.mimeType,
      input.filename,
    );
    const data = copy.toString("base64");
    copy.fill(0);

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        ...buildOpenRouterHeaders({
          apiKey: this.apiKey,
          httpReferer: this.httpReferer,
          appTitle: this.appTitle,
        }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input_audio: { data, format },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `AI transcription request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as TranscriptionResponse;
    const text = payload.text?.trim();
    if (!text) {
      throw new Error("AI transcription returned an empty transcript");
    }

    return text;
  }
}
