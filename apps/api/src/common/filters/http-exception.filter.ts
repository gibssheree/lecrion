import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HttpExceptionFilter — Global exception filter.
 *
 * Normalizes all errors into a consistent JSON shape:
 *   { statusCode, error, message, path, timestamp, correlationId }
 *
 * Per 05-security-ops.md § Minimum Error Strategy:
 *   "Fail fast on bad requests"
 *   "Use structured error codes instead of free-form strings"
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as any;
        message = b.message ?? message;
        error = b.error ?? exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const correlationId =
      (req.headers['x-correlation-id'] as string) ??
      (req as any).correlationId ??
      null;

    // Don't log 401/403 as errors — they're expected
    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} → ${status}: ${message}`);
    } else if (status >= 400) {
      this.logger.warn(`${req.method} ${req.url} → ${status}: ${message}`);
    }

    res.status(status).json({
      statusCode: status,
      error,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
      correlationId,
    });
  }
}
