import {
  OPENROUTER_BASE_URL,
  OPENROUTER_DEFAULT_CHAT_MODEL,
  OPENROUTER_DEFAULT_TRANSCRIBE_MODEL,
  OpenRouterAudioTranscriber,
  OpenRouterTextCommandParser,
  resolveAiRuntimeConfig,
} from '@finance/ai';

import { createAudioTranscriber } from './audio-transcriber.provider.js';
import { createTextCommandParser } from './text-command-parser.provider.js';

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestBody(body: BodyInit | null | undefined): string {
  if (typeof body !== 'string') {
    throw new Error('expected a JSON string request body');
  }
  return body;
}

function stubFetch(payload: unknown): {
  calls: FetchCall[];
  restore: () => void;
} {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: requestUrl(input), init });
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(payload),
    } as Response);
  };

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

describe('OpenRouter AI runtime', () => {
  const restores: Array<() => void> = [];

  afterEach(() => {
    while (restores.length) {
      restores.pop()?.();
    }
  });

  it('defaults text and voice to OpenRouter when only OPENROUTER_API_KEY is set', () => {
    const runtime = resolveAiRuntimeConfig({
      OPENROUTER_API_KEY: 'or-test-key',
    });

    expect(runtime).toEqual(
      expect.objectContaining({
        provider: 'openrouter',
        apiKey: 'or-test-key',
        baseUrl: OPENROUTER_BASE_URL,
        chatModel: OPENROUTER_DEFAULT_CHAT_MODEL,
        transcribeModel: OPENROUTER_DEFAULT_TRANSCRIBE_MODEL,
      }),
    );
    expect(runtime?.baseUrl).not.toContain('api.openai.com');
  });

  it('accepts OPENAI_API_KEY as a temporary alias and still uses OpenRouter', () => {
    const runtime = resolveAiRuntimeConfig({
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'legacy-key',
      OPENAI_MODEL: 'openai/gpt-4o-mini',
    });

    expect(runtime?.apiKey).toBe('legacy-key');
    expect(runtime?.provider).toBe('openrouter');
    expect(runtime?.baseUrl).toBe(OPENROUTER_BASE_URL);
    expect(runtime?.chatModel).toBe('openai/gpt-4o-mini');
  });

  it('prefers OPENROUTER_* over the temporary OpenAI aliases', () => {
    const runtime = resolveAiRuntimeConfig({
      OPENROUTER_API_KEY: 'or-key',
      OPENAI_API_KEY: 'legacy-key',
      OPENROUTER_MODEL: 'anthropic/claude-sonnet-4',
      OPENAI_MODEL: 'gpt-4o-mini',
      OPENROUTER_TRANSCRIBE_MODEL: 'openai/whisper-large-v3',
      OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
      OPENROUTER_HTTP_REFERER: 'https://ledger.example',
      OPENROUTER_APP_TITLE: 'Ledger',
    });

    expect(runtime).toEqual({
      provider: 'openrouter',
      apiKey: 'or-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      chatModel: 'anthropic/claude-sonnet-4',
      transcribeModel: 'openai/whisper-large-v3',
      httpReferer: 'https://ledger.example',
      appTitle: 'Ledger',
    });
  });

  it('disables parsers when no API key is configured', () => {
    const config = { get: () => undefined };
    const parser = createTextCommandParser(config as never);
    const transcriber = createAudioTranscriber(config as never);

    expect(parser).not.toBeInstanceOf(OpenRouterTextCommandParser);
    expect(transcriber).not.toBeInstanceOf(OpenRouterAudioTranscriber);
    return expect(
      parser.parseText({
        text: 'hi',
        referenceDate: '2026-09-04',
        accounts: [],
        categories: [],
      }),
    ).rejects.toThrow('AI text command parser is not configured');
  });

  it('sends chat completions to OpenRouter with attribution headers', async () => {
    const fetchStub = stubFetch({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'create_ledger_entry',
              data: {
                type: 'expense',
                amount: 3.19,
                currency: 'USD',
                merchant: 'Starbucks',
                account: 'BAC',
                category: 'Food',
                occurredAt: '2026-09-04',
              },
              confidence: 0.93,
            }),
          },
        },
      ],
    });
    restores.push(fetchStub.restore);

    const parser = new OpenRouterTextCommandParser({
      apiKey: 'or-key',
      httpReferer: 'https://ledger.example',
      appTitle: 'Ledger',
    });
    const result = await parser.parseText({
      text: 'spent 3.19 at Starbucks',
      referenceDate: '2026-09-04',
      accounts: [{ name: 'BAC', currency: 'USD' }],
      categories: [{ name: 'Food', kind: 'expense' }],
    });

    expect(result.intent).toBe('create_ledger_entry');
    expect(fetchStub.calls[0]?.url).toBe(
      'https://openrouter.ai/api/v1/chat/completions',
    );
    expect(fetchStub.calls[0]?.init?.method).toBe('POST');
    expect(fetchStub.calls[0]?.init?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer or-key',
        'HTTP-Referer': 'https://ledger.example',
        'X-Title': 'Ledger',
      }),
    );
    const body = JSON.parse(requestBody(fetchStub.calls[0]?.init?.body)) as {
      model: string;
    };
    expect(body.model).toBe(OPENROUTER_DEFAULT_CHAT_MODEL);
  });

  it('transcribes via OpenRouter input_audio JSON, not api.openai.com', async () => {
    const fetchStub = stubFetch({ text: 'gaste 3.19 en Starbucks' });
    restores.push(fetchStub.restore);

    const transcriber = new OpenRouterAudioTranscriber({ apiKey: 'or-key' });
    const audio = Buffer.from('fake-audio');
    const transcript = await transcriber.transcribeAudio({
      audio,
      mimeType: 'audio/webm',
      filename: 'clip.webm',
    });

    expect(transcript).toBe('gaste 3.19 en Starbucks');
    expect(fetchStub.calls[0]?.url).toBe(
      'https://openrouter.ai/api/v1/audio/transcriptions',
    );
    expect(fetchStub.calls[0]?.url).not.toContain('api.openai.com');
    expect(fetchStub.calls[0]?.init?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer or-key',
        'Content-Type': 'application/json',
        'HTTP-Referer': expect.any(String),
        'X-Title': expect.any(String),
      }),
    );
    const body = JSON.parse(requestBody(fetchStub.calls[0]?.init?.body)) as {
      model: string;
      input_audio: { format: string; data: string };
    };
    expect(body.model).toBe(OPENROUTER_DEFAULT_TRANSCRIBE_MODEL);
    expect(body.input_audio.format).toBe('webm');
    expect(body.input_audio.data).toBe(
      Buffer.from('fake-audio').toString('base64'),
    );
  });
});
