import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiIntakeController } from './ai-intake.controller.js';
import { AiIntakeService } from './ai-intake.service.js';
import {
  createTextCommandParser,
  TEXT_COMMAND_PARSER,
} from './text-command-parser.provider.js';

@Module({
  controllers: [AiIntakeController],
  providers: [
    AiIntakeService,
    {
      provide: TEXT_COMMAND_PARSER,
      inject: [ConfigService],
      useFactory: createTextCommandParser,
    },
  ],
})
export class AiIntakeModule {}
