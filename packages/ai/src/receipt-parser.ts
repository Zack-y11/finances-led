import type { ParsedFinanceCommand } from "@finance/contracts";

import type {
  ParserAccountOption,
  ParserCategoryOption,
} from "./text-command-parser.js";

export type ParseReceiptInput = {
  image: Buffer;
  mimeType: string;
  filename: string;
  referenceDate: string;
  accounts: ParserAccountOption[];
  categories: ParserCategoryOption[];
};

export interface ReceiptParser {
  parseReceipt(input: ParseReceiptInput): Promise<ParsedFinanceCommand>;
}
