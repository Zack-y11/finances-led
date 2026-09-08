import {
  OpenRouterReceiptParser,
  resolveAiRuntimeConfig,
  type ReceiptParser,
} from '@finance/ai';
import { ConfigService } from '@nestjs/config';

export const RECEIPT_PARSER = Symbol('RECEIPT_PARSER');

export class ReceiptParserNotConfiguredError extends Error {
  constructor() {
    super('AI receipt parser is not configured');
  }
}

class DisabledReceiptParser implements ReceiptParser {
  parseReceipt(): Promise<never> {
    return Promise.reject(new ReceiptParserNotConfiguredError());
  }
}

export function createReceiptParser(config: ConfigService): ReceiptParser {
  const runtime = resolveAiRuntimeConfig(config);
  if (!runtime) return new DisabledReceiptParser();

  return new OpenRouterReceiptParser({
    apiKey: runtime.apiKey,
    model: runtime.visionModel,
    baseUrl: runtime.baseUrl,
    httpReferer: runtime.httpReferer,
    appTitle: runtime.appTitle,
  });
}
