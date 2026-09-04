import {
  parsedFinanceCommandSchema,
  type ParsedFinanceCommand,
} from "@finance/contracts";

import {
  buildOpenRouterHeaders,
  OPENROUTER_BASE_URL,
  OPENROUTER_DEFAULT_APP_TITLE,
  OPENROUTER_DEFAULT_CHAT_MODEL,
  OPENROUTER_DEFAULT_HTTP_REFERER,
} from "./openrouter.js";
import type {
  ParseTextCommandInput,
  TextCommandParser,
} from "./text-command-parser.js";

type ChatMessage = {
  message?: {
    content?: string | null;
  };
};

type ChatCompletionResponse = {
  choices?: ChatMessage[];
};

export type OpenRouterTextCommandParserOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  httpReferer?: string;
  appTitle?: string;
};

export class OpenRouterTextCommandParser implements TextCommandParser {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly httpReferer: string;
  private readonly appTitle: string;

  constructor(options: OpenRouterTextCommandParserOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? OPENROUTER_DEFAULT_CHAT_MODEL;
    this.baseUrl = options.baseUrl ?? OPENROUTER_BASE_URL;
    this.httpReferer = options.httpReferer ?? OPENROUTER_DEFAULT_HTTP_REFERER;
    this.appTitle = options.appTitle ?? OPENROUTER_DEFAULT_APP_TITLE;
  }

  async parseText(input: ParseTextCommandInput): Promise<ParsedFinanceCommand> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...buildOpenRouterHeaders({
          apiKey: this.apiKey,
          httpReferer: this.httpReferer,
          appTitle: this.appTitle,
        }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `AI parser request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI parser returned an empty response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI parser returned non-JSON content");
    }

    const result = parsedFinanceCommandSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error("AI parser returned an invalid finance command");
    }

    return result.data;
  }
}

function buildSystemPrompt(): string {
  return [
    "You parse short personal-finance text commands in any language (e.g. English, Spanish) into JSON only.",
    "Return exactly one JSON object with intent, data, and confidence (number between 0 and 1).",
    'The only supported intent is "create_ledger_entry".',
    'data.type must be "expense" (e.g., spent/gaste/compró), "income" (e.g., earned/gane/cobré/pagaron), or "adjustment".',
    "data.amount must be a positive number, not a string.",
    "data.currency must be a 3-letter uppercase ISO code (e.g. USD). Default to USD if unspecified.",
    "data.merchant is the vendor or payee (e.g., Starbucks) if present.",
    "data.account must be the matching account name from the provided account catalog when possible (e.g. BAC, Cash, Bank).",
    "data.category must be the best matching category name from the provided category catalog when possible (e.g. Food, Groceries, Transit).",
    'data.occurredAt must be a YYYY-MM-DD date string. Resolve relative terms like "today"/"hoy", "yesterday"/"ayer", or specific days using referenceDate.',
    "Do not create, update, or delete records. Do not return database IDs.",
    "Do not include markdown code block formatting or extra explanatory text.",
  ].join(" ");
}
