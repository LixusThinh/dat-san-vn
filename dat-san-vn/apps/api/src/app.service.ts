import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'DatSanVN API is running!';
  }

  /**
   * Health check — runs a raw SQL query to verify DB connectivity.
   * Returns status, timestamp, and database connection state.
   */
  async checkHealth(): Promise<{
    status: string;
    timestamp: string;
    database: string;
    uptime: number;
  }> {
    let dbStatus = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1 AS ok`;
      dbStatus = 'connected';
    } catch (error) {
      this.logger.error('Health check: DB connection failed', error);
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
    };
  }
}
