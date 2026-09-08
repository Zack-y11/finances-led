import {
  OPENROUTER_BASE_URL,
  OPENROUTER_DEFAULT_APP_TITLE,
  OPENROUTER_DEFAULT_CHAT_MODEL,
  OPENROUTER_DEFAULT_HTTP_REFERER,
  OPENROUTER_DEFAULT_TRANSCRIBE_MODEL,
  OPENROUTER_DEFAULT_VISION_MODEL,
} from "./openrouter.js";

export type AiProviderName = "openrouter";

export type EnvReader =
  | Record<string, string | undefined>
  | { get(key: string): unknown };

export type AiRuntimeConfig = {
  provider: AiProviderName;
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  transcribeModel: string;
  visionModel: string;
  httpReferer: string;
  appTitle: string;
};

function readEnv(env: EnvReader, key: string): string | undefined {
  const raw =
    typeof (env as { get?: (name: string) => unknown }).get === "function"
      ? (env as { get(name: string): unknown }).get(key)
      : (env as Record<string, string | undefined>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

/**
 * OpenRouter is the only supported provider. `AI_PROVIDER=openai` is accepted
 * as a deprecated alias and still routes to OpenRouter. `OPENAI_API_KEY` is a
 * temporary fallback when `OPENROUTER_API_KEY` is empty.
 */
export function resolveAiRuntimeConfig(env: EnvReader): AiRuntimeConfig | null {
  const apiKey =
    readEnv(env, "OPENROUTER_API_KEY") ?? readEnv(env, "OPENAI_API_KEY");
  if (!apiKey) return null;

  return {
    provider: "openrouter",
    apiKey,
    baseUrl:
      readEnv(env, "OPENROUTER_BASE_URL") ??
      OPENROUTER_BASE_URL,
    chatModel:
      readEnv(env, "OPENROUTER_MODEL") ??
      readEnv(env, "AI_MODEL") ??
      readEnv(env, "OPENAI_MODEL") ??
      OPENROUTER_DEFAULT_CHAT_MODEL,
    transcribeModel:
      readEnv(env, "OPENROUTER_TRANSCRIBE_MODEL") ??
      readEnv(env, "OPENAI_TRANSCRIBE_MODEL") ??
      OPENROUTER_DEFAULT_TRANSCRIBE_MODEL,
    visionModel:
      readEnv(env, "OPENROUTER_VISION_MODEL") ??
      readEnv(env, "OPENROUTER_MODEL") ??
      readEnv(env, "AI_MODEL") ??
      readEnv(env, "OPENAI_MODEL") ??
      OPENROUTER_DEFAULT_VISION_MODEL,
    httpReferer:
      readEnv(env, "OPENROUTER_HTTP_REFERER") ??
      OPENROUTER_DEFAULT_HTTP_REFERER,
    appTitle:
      readEnv(env, "OPENROUTER_APP_TITLE") ?? OPENROUTER_DEFAULT_APP_TITLE,
  };
}
