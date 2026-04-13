import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  /**
   * Enable rawBody: true so NestJS preserves the raw Buffer on req.rawBody.
   *
   * This is required by the @RawBody() decorator used in ClerkWebhookController.
   * Svix needs the EXACT raw bytes for HMAC-SHA256 signature verification —
   * a parsed/re-serialized JSON object would produce a different hash and fail.
   *
   * NestJS docs: https://docs.nestjs.com/faq/raw-body
   */
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const logger = new Logger('Bootstrap');

  // ── Global pipes ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,       // Auto-transform payloads to DTO instances
    }),
  );

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  // ── Global prefix (exclude webhooks so path stays /webhooks/clerk) ──────────
  app.setGlobalPrefix('api', {
    exclude: ['webhooks/(.*)'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 DatSanVN API running on: http://localhost:${port}/api`);
  logger.log(`🔗 Clerk webhook endpoint: POST http://localhost:${port}/webhooks/clerk`);
}

bootstrap();
