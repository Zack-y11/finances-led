import type { CategoryKind, ParsedFinanceCommand } from "@finance/contracts";

export type ParserAccountOption = {
  name: string;
  currency: string;
};

export type ParserCategoryOption = {
  name: string;
  kind: CategoryKind;
};

export type ParseTextCommandInput = {
  text: string;
  referenceDate: string;
  accounts: ParserAccountOption[];
  categories: ParserCategoryOption[];
};

export interface TextCommandParser {
  parseText(input: ParseTextCommandInput): Promise<ParsedFinanceCommand>;
}
