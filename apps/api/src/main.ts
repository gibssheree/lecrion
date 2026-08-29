import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
    bufferLogs: true,
  });

  // Security headers (SEC-08) — X-Frame-Options, HSTS, X-Content-Type-Options, etc.
  app.use(helmet());

  // Rate limiting (SEC-07) — a generous baseline everywhere, plus a tight
  // limit on the two endpoints that are actually brute-forceable: login and
  // register. Keyed by IP; counts reset every window.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 60_000,
      limit: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: { status: 'error', message: 'Too many login attempts. Try again in a minute.' },
    }),
  );
  app.use(
    '/api/auth/register',
    rateLimit({
      windowMs: 60 * 60_000,
      limit: 3,
      standardHeaders: true,
      legacyHeaders: false,
      message: { status: 'error', message: 'Too many registration attempts. Try again later.' },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // ── Optionally serve the pos-web SPA from this same process ─────────────
  // The SPA calls the API on relative paths ("" as its base URL) and opens
  // its Socket.IO connection against window.location.origin, so it only
  // works when served from the same origin as the API. In the Docker Compose
  // deployment nginx provides that origin; on a single-service host (Railway,
  // Render, Fly — where one persistent volume can only attach to one service)
  // there is no nginx, so the API serves the SPA itself.
  //
  // Unset CLIENT_DIST_DIR leaves behaviour exactly as before.
  const clientDist = process.env['CLIENT_DIST_DIR'];
  if (clientDist) {
    const indexHtml = join(clientDist, 'index.html');
    if (!existsSync(indexHtml)) {
      logger.warn(
        `CLIENT_DIST_DIR is set to '${clientDist}' but no index.html is there — not serving the SPA.`,
        'Bootstrap',
      );
    } else {
      // index:false so "/" falls through to the SPA fallback below rather
      // than being served without the no-cache header the shell needs.
      app.useStaticAssets(clientDist, { index: false });

      // Client-side routing: any GET that isn't an API or realtime path
      // returns the app shell and lets the router resolve it. Registered on
      // the underlying express instance because Nest's router only knows
      // about controller routes and would 404 these.
      const expressApp = app.getHttpAdapter().getInstance();
      expressApp.get(/^(?!\/api(?:\/|$)|\/ws(?:\/|$)).*/, (_req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(indexHtml);
      });

      logger.log(`[SPA] Serving pos-web from ${clientDist}`, 'Bootstrap');
    }
  }

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
