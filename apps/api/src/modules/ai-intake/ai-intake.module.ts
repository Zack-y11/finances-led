import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RulesModule } from '../rules/rules.module.js';
import { AiIntakeController } from './ai-intake.controller.js';
import { AiIntakeService } from './ai-intake.service.js';
import {
  AUDIO_TRANSCRIBER,
  createAudioTranscriber,
} from './audio-transcriber.provider.js';
import {
  createReceiptParser,
  RECEIPT_PARSER,
} from './receipt-parser.provider.js';
import {
  createTextCommandParser,
  TEXT_COMMAND_PARSER,
} from './text-command-parser.provider.js';

@Module({
  imports: [RulesModule],
  controllers: [AiIntakeController],
  providers: [
    AiIntakeService,
    {
      provide: TEXT_COMMAND_PARSER,
      inject: [ConfigService],
      useFactory: createTextCommandParser,
    },
    {
      provide: AUDIO_TRANSCRIBER,
      inject: [ConfigService],
      useFactory: createAudioTranscriber,
    },
    {
      provide: RECEIPT_PARSER,
      inject: [ConfigService],
      useFactory: createReceiptParser,
    },
  ],
})
export class AiIntakeModule {}
