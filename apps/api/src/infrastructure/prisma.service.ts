import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { createPrismaClient, PrismaClient } from '@finance/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy
{
  private readonly client: PrismaClient;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
    this.client = createPrismaClient(databaseUrl);
  }

  get db(): PrismaClient {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}