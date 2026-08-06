import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  parsedFinanceCommandSchema,
  type CategoryKind,
  type ParsedFinanceCommand,
  type ParseTextCommandRequest,
} from '@finance/contracts';
import type { TextCommandParser } from '@finance/ai';

import { PrismaService } from '../../infrastructure/prisma.service.js';
import {
  TEXT_COMMAND_PARSER,
  TextCommandParserNotConfiguredError,
} from './text-command-parser.provider.js';
import { RulesService } from '../rules/rules.service.js';
type PrismaCategoryKind = 'INCOME' | 'EXPENSE' | 'BOTH';

@Injectable()
export class AiIntakeService {
  private readonly userId: string;

  constructor(
    @Inject(TEXT_COMMAND_PARSER)
    private readonly textCommandParser: TextCommandParser,
    private readonly rulesService: RulesService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  async parseTextCommand(
    input: ParseTextCommandRequest,
  ): Promise<ParsedFinanceCommand> {
    const referenceDate = input.referenceDate ?? currentDate();
    const [accounts, categories] = await Promise.all([
      this.prisma.db.account.findMany({
        where: { userId: this.userId, isActive: true },
        select: { name: true, currency: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.db.category.findMany({
        where: { userId: this.userId },
        select: { name: true, kind: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    try {
      const command = await this.textCommandParser.parseText({
        text: input.text,
        referenceDate,
        accounts,
        categories: categories.map((category) => ({
          name: category.name,
          kind: toContractCategoryKind(category.kind),
        })),
      });

      const result = parsedFinanceCommandSchema.safeParse(command);
      if (!result.success) {
        throw new BadGatewayException('AI parser returned an invalid command');
      }

      const parsedData = result.data;
      const evaluated = await this.rulesService.applyRules({
        merchant: parsedData.data.merchant,
        amount: parsedData.data.amount,
        category: parsedData.data.category,
        account: parsedData.data.account,
      });

      parsedData.data.category = evaluated.category || parsedData.data.category;
      parsedData.data.account = evaluated.account || parsedData.data.account;

      return parsedData;
    } catch (error) {
      if (error instanceof TextCommandParserNotConfiguredError) {
        throw new ServiceUnavailableException(
          'AI text command parser is not configured',
        );
      }
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('AI text command parser failed');
    }
  }
}

function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toContractCategoryKind(kind: PrismaCategoryKind): CategoryKind {
  switch (kind) {
    case 'INCOME':
      return 'income';
    case 'EXPENSE':
      return 'expense';
    case 'BOTH':
      return 'both';
  }
}
