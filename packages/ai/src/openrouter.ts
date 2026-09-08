export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_DEFAULT_CHAT_MODEL = "openai/gpt-4o-mini";
export const OPENROUTER_DEFAULT_TRANSCRIBE_MODEL = "openai/whisper-1";
export const OPENROUTER_DEFAULT_VISION_MODEL = "openai/gpt-4o-mini";
export const OPENROUTER_DEFAULT_HTTP_REFERER =
  "https://github.com/Zack-y11/finances-led";
export const OPENROUTER_DEFAULT_APP_TITLE = "Finance Ledger";

const AUDIO_FORMATS = new Set([
  "wav",
  "mp3",
  "flac",
  "m4a",
  "ogg",
  "webm",
  "aac",
]);

const FORMAT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/flac": "flac",
};

export type OpenRouterRequestHeaders = {
  Authorization: string;
  "HTTP-Referer": string;
  "X-Title": string;
};

export function buildOpenRouterHeaders(options: {
  apiKey: string;
  httpReferer?: string;
  appTitle?: string;
}): OpenRouterRequestHeaders {
  return {
    Authorization: `Bearer ${options.apiKey}`,
    "HTTP-Referer": options.httpReferer ?? OPENROUTER_DEFAULT_HTTP_REFERER,
    "X-Title": options.appTitle ?? OPENROUTER_DEFAULT_APP_TITLE,
  };
}

export function audioFormatFromMimeOrFilename(
  mimeType: string,
  filename: string,
): string {
  const mime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  const fromMime = FORMAT_BY_MIME[mime];
  if (fromMime) return fromMime;

  const extension = filename.toLowerCase().split(".").pop() ?? "";
  if (AUDIO_FORMATS.has(extension)) return extension;

  return "webm";
}
