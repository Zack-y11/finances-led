import {
  OpenRouterTextCommandParser,
  resolveAiRuntimeConfig,
  type TextCommandParser,
} from '@finance/ai';
import { ConfigService } from '@nestjs/config';

export const TEXT_COMMAND_PARSER = Symbol('TEXT_COMMAND_PARSER');

export class TextCommandParserNotConfiguredError extends Error {
  constructor() {
    super('AI text command parser is not configured');
  }
}

class DisabledTextCommandParser implements TextCommandParser {
  parseText(): Promise<never> {
    return Promise.reject(new TextCommandParserNotConfiguredError());
  }
}

export function createTextCommandParser(
  config: ConfigService,
): TextCommandParser {
  const runtime = resolveAiRuntimeConfig(config);
  if (!runtime) return new DisabledTextCommandParser();

  return new OpenRouterTextCommandParser({
    apiKey: runtime.apiKey,
    model: runtime.chatModel,
    baseUrl: runtime.baseUrl,
    httpReferer: runtime.httpReferer,
    appTitle: runtime.appTitle,
  });
}
