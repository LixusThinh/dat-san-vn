import { SharedMetaConfiguration } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const getBullMQConfig = (configService: ConfigService): SharedMetaConfiguration => ({
  connection: {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    password: configService.get<string>('REDIS_PASSWORD', ''),
    db: configService.get<number>('REDIS_DB', 0),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
