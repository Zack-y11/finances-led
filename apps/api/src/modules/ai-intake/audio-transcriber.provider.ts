import {
  OpenRouterAudioTranscriber,
  resolveAiRuntimeConfig,
  type AudioTranscriber,
} from '@finance/ai';
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
  const runtime = resolveAiRuntimeConfig(config);
  if (!runtime) return new DisabledAudioTranscriber();

  return new OpenRouterAudioTranscriber({
    apiKey: runtime.apiKey,
    model: runtime.transcribeModel,
    baseUrl: runtime.baseUrl,
    httpReferer: runtime.httpReferer,
    appTitle: runtime.appTitle,
  });
}
