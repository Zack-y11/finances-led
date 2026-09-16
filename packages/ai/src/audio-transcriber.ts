import type { OpenRouterTranscribeLanguage } from "./openrouter.js";

export type AudioTranscriptionInput = {
  audio: Buffer;
  mimeType: string;
  filename: string;
  language?: OpenRouterTranscribeLanguage;
};

export interface AudioTranscriber {
  transcribeAudio(input: AudioTranscriptionInput): Promise<string>;
}
