import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLoggerService } from './infrastructure/logging/app-logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { AuthService } from './modules/auth/auth.service';
import { AppConfigService } from './infrastructure/config/app-config.service';
import { RealtimeService } from './infrastructure/realtime/realtime.service';

async function bootstrap() {
  const logger = new AppLoggerService();

  const app = await NestFactory.create(AppModule, {
    logger,
    bufferLogs: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(AppValidationPipe);

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global logging interceptor — pass the logger so correlation IDs flow through
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // Global guards
  const reflector = app.get(Reflector);
  const authService = app.get(AuthService);
  const configService = app.get(AppConfigService);

  app.useGlobalGuards(
    new JwtAuthGuard(reflector, authService, configService),
    new RolesGuard(reflector),
    new TenantGuard(),
  );

  // CORS — allow dashboard and pos-web origins.
  // DASHBOARD_ORIGIN (same env var used by Socket.IO in libs/realtime/src/socket.ts)
  // is a comma-separated list of allowed origins, or "*" to allow any origin.
  // Falls back to local dev origins when unset.
  const dashboardOrigin = process.env['DASHBOARD_ORIGIN'];
  const allowedOrigins = dashboardOrigin
    ? dashboardOrigin === '*'
      ? '*'
      : dashboardOrigin.split(',').map((s) => s.trim())
    : [
        'http://localhost:5173', // Vite dashboard dev
        'http://localhost:3001', // dashboard prod
        'http://localhost:3002', // pos-web
      ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = configService.port;
  await app.listen(port);

  // ── Initialize Socket.IO on the underlying HTTP server ──────────────────
  // Must be done AFTER app.listen() so the HTTP server is ready.
  const httpServer = app.getHttpServer();
  const realtimeService = app.get(RealtimeService);
  realtimeService.init(httpServer);

  logger.log(`[NestJS API] Started on port ${port}`, 'Bootstrap');
  logger.log(
    `[Socket.IO] Realtime server on ws://localhost:${port}/ws/realtime`,
    'Bootstrap',
  );
}

bootstrap();
