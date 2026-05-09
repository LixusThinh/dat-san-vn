// ============================================================
// DatSanVN — PrismaService (Serverless-safe singleton)
// Tránh tạo quá nhiều connection khi hot-reload (dev)
// hoặc cold-start liên tục trên Vercel (prod)
// ============================================================

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Cache PrismaClient trên globalThis để tránh connection exhaustion
// khi dev server hot-reload hoặc serverless cold-start
const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Reuse existing instance hoặc tạo mới
    if (!globalForPrisma.__prisma) {
      globalForPrisma.__prisma = createPrismaClient();
    }

    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });

    // Trong production, không cache trên globalThis
    // (mỗi container chỉ có 1 instance duy nhất)
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.__prisma = this;
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database (Neon PostgreSQL)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}