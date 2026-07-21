import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database.module.js';
import { validateEnvironment } from './config/env.validation.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { EntryGroupsModule } from './modules/entry-groups/entry-groups.module.js';
import { LedgerModule } from './modules/ledger/ledger.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '../../.env', '.env.local', '.env'],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AccountsModule,
    CategoriesModule,
    AnalyticsModule,
    EntryGroupsModule,
    LedgerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
