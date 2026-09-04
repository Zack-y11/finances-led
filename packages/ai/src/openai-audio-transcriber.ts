import type {
  AudioTranscriber,
  AudioTranscriptionInput,
} from "./audio-transcriber.js";

type OpenAiTranscriptionResponse = {
  text?: string;
};

export type OpenAiAudioTranscriberOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
};

export class OpenAiAudioTranscriber implements AudioTranscriber {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(options: OpenAiAudioTranscriberOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "whisper-1";
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  }

  async transcribeAudio(input: AudioTranscriptionInput): Promise<string> {
    const copy = Uint8Array.from(input.audio);
    const file = new File([copy], input.filename, { type: input.mimeType });
    const form = new FormData();
    form.append("file", file);
    form.append("model", this.model);
    form.append("response_format", "json");

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(
        `AI transcription request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as OpenAiTranscriptionResponse;
    const text = payload.text?.trim();
    if (!text) {
      throw new Error("AI transcription returned an empty transcript");
    }

    return text;
  }
}
