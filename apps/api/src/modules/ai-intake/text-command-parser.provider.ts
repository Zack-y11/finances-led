import { OpenAiTextCommandParser, type TextCommandParser } from '@finance/ai';
import { ConfigService } from '@nestjs/config';

export const TEXT_COMMAND_PARSER = Symbol('TEXT_COMMAND_PARSER');

export class TextCommandParserNotConfiguredError extends Error {
  constructor() {
    super('AI text command parser is not configured');
  }
}

class DisabledTextCommandParser implements TextCommandParser {
  async parseText(): Promise<never> {
    throw new TextCommandParserNotConfiguredError();
  }
}

export function createTextCommandParser(
  config: ConfigService,
): TextCommandParser {
  const apiKey = config.get<string>('OPENAI_API_KEY');
  if (!apiKey) return new DisabledTextCommandParser();

  const options = { apiKey };
  const model = config.get<string>('OPENAI_MODEL');
  const baseUrl = config.get<string>('OPENAI_BASE_URL');

  return new OpenAiTextCommandParser({
    ...options,
    ...(model ? { model } : {}),
    ...(baseUrl ? { baseUrl } : {}),
  });
}
