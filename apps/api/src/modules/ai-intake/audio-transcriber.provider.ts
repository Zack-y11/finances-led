import { OpenAiAudioTranscriber, type AudioTranscriber } from '@finance/ai';
import { ConfigService } from '@nestjs/config';

export const AUDIO_TRANSCRIBER = Symbol('AUDIO_TRANSCRIBER');

export class AudioTranscriberNotConfiguredError extends Error {
  constructor() {
    super('AI audio transcriber is not configured');
  }
}

class DisabledAudioTranscriber implements AudioTranscriber {
  transcribeAudio(): Promise<never> {
    return Promise.reject(new AudioTranscriberNotConfiguredError());
  }
}

export function createAudioTranscriber(
  config: ConfigService,
): AudioTranscriber {
  const apiKey = config.get<string>('OPENAI_API_KEY');
  if (!apiKey) return new DisabledAudioTranscriber();

  const options = { apiKey };
  const model = config.get<string>('OPENAI_TRANSCRIBE_MODEL');
  const baseUrl = config.get<string>('OPENAI_BASE_URL');

  return new OpenAiAudioTranscriber({
    ...options,
    ...(model ? { model } : {}),
    ...(baseUrl ? { baseUrl } : {}),
  });
}
