import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AppLoggerService } from '../../infrastructure/logging/app-logger.service';
import { metrics } from '@libs/common/src/telemetry/metrics';

let _reqCounter = 0;

/**
 * LoggingInterceptor — attaches correlation IDs and logs every request.
 *
 * Per 05-security-ops.md § Observability:
 *   "Structured logs, Correlation ids"
 *
 * - Generates or propagates X-Correlation-Id on every request
 * - Threads the correlation ID into AppLoggerService so all NestJS log
 *   lines within the request carry the same ID
 * - Records HTTP request latency into the metrics histogram
 * - Skips /health and /metrics to avoid log noise
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly SKIP_PATHS = new Set([
    '/api/health',
    '/api/metrics',
    '/health',
    '/metrics',
  ]);

  constructor(@Optional() private readonly appLogger?: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (this.SKIP_PATHS.has(req.path)) return next.handle();

    // Generate or propagate correlation ID
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      `req-${Date.now()}-${(++_reqCounter).toString(36)}`;

    (req as any).correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    // Thread into AppLoggerService so all NestJS log lines carry it
    this.appLogger?.setCorrelationId(correlationId);

    const start = Date.now();
    const { method, url } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          const status = res.statusCode;

          // Record latency metric
          metrics.httpRequestDuration.observe(ms);

          const level =
            status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';
          this.logger[level](
            `${method} ${url} ${status} +${ms}ms [${correlationId}]`,
          );

          // Clear correlation ID after response
          this.appLogger?.setCorrelationId(null);
        },
        error: (err) => {
          const ms = Date.now() - start;
          this.logger.error(
            `${method} ${url} ERR +${ms}ms [${correlationId}]: ${err.message}`,
          );
          this.appLogger?.setCorrelationId(null);
        },
      }),
    );
  }
}
