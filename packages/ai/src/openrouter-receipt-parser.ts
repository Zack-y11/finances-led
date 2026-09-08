import {
  parsedFinanceCommandSchema,
  type ParsedFinanceCommand,
} from "@finance/contracts";

import {
  buildOpenRouterHeaders,
  OPENROUTER_BASE_URL,
  OPENROUTER_DEFAULT_APP_TITLE,
  OPENROUTER_DEFAULT_HTTP_REFERER,
  OPENROUTER_DEFAULT_VISION_MODEL,
} from "./openrouter.js";
import type { ParseReceiptInput, ReceiptParser } from "./receipt-parser.js";

type ChatMessage = {
  message?: {
    content?: string | null;
  };
};

type ChatCompletionResponse = {
  choices?: ChatMessage[];
};

export type OpenRouterReceiptParserOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  httpReferer?: string;
  appTitle?: string;
};

export class OpenRouterReceiptParser implements ReceiptParser {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly httpReferer: string;
  private readonly appTitle: string;

  constructor(options: OpenRouterReceiptParserOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? OPENROUTER_DEFAULT_VISION_MODEL;
    this.baseUrl = options.baseUrl ?? OPENROUTER_BASE_URL;
    this.httpReferer = options.httpReferer ?? OPENROUTER_DEFAULT_HTTP_REFERER;
    this.appTitle = options.appTitle ?? OPENROUTER_DEFAULT_APP_TITLE;
  }

  async parseReceipt(input: ParseReceiptInput): Promise<ParsedFinanceCommand> {
    const copy = Buffer.from(input.image);
    const mimeType = normalizeImageMime(input.mimeType);
    const dataUrl = `data:${mimeType};base64,${copy.toString("base64")}`;
    copy.fill(0);

    const catalog = {
      referenceDate: input.referenceDate,
      accounts: input.accounts,
      categories: input.categories,
    };

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: JSON.stringify(catalog),
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `AI receipt parser request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI receipt parser returned an empty response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI receipt parser returned non-JSON content");
    }

    const result = parsedFinanceCommandSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error("AI receipt parser returned an invalid finance command");
    }

    return result.data;
  }
}

function normalizeImageMime(mimeType: string): string {
  const mime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (mime === "image/jpg") return "image/jpeg";
  return mime || "image/jpeg";
}

function buildSystemPrompt(): string {
  return [
    "You extract personal-finance facts from a receipt photo into JSON only.",
    "Return exactly one JSON object with intent, data, and confidence (number between 0 and 1).",
    'The only supported intent is "create_ledger_entry".',
    'data.type is almost always "expense". Use "income" only if the document is clearly a payout or refund credit, not a purchase receipt.',
    "data.amount must be the grand total the customer paid, including tax, as a positive number, not a string. Prefer the labeled total / amount due, not subtotal, tip-only, or change.",
    "data.currency must be a 3-letter uppercase ISO code. Infer from symbols or text. Default to USD if unspecified.",
    "data.merchant is the store or vendor name printed on the receipt.",
    "data.account must be the matching account name from the provided account catalog when a payment method is visible (cash, BAC, card brand, wallet). If unknown, pick the best catalog match and lower confidence.",
    "data.category must be the best matching category name from the provided category catalog (e.g. Food, Groceries, Transit).",
    "data.occurredAt must be a YYYY-MM-DD date string. Use the printed receipt date. If missing or unreadable, use referenceDate.",
    "Do not extract card numbers, CVV, full PANs, addresses, phone numbers, barcodes, or unrelated document text.",
    "Do not create, update, or delete records. Do not return database IDs.",
    "Do not include markdown code block formatting or extra explanatory text.",
    "If the image is not a receipt or is unreadable, still return JSON with your best guess and confidence below 0.5.",
  ].join(" ");
}
