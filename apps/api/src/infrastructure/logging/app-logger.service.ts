import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

/**
 * AppLoggerService — structured JSON logger for NestJS.
 *
 * Per 05-security-ops.md § Observability:
 *   "Structured logs, Correlation ids"
 *
 * In production: emits JSON lines to stdout/stderr for log aggregators.
 * In development: emits human-readable colored output to stdout.
 *
 * Correlation IDs are threaded via setCorrelationId() — called by the
 * LoggingInterceptor at the start of each request.
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly isDev = process.env['NODE_ENV'] !== 'production';
  private _correlationId: string | null = null;

  /** Called by LoggingInterceptor to attach the request correlation ID. */
  setCorrelationId(id: string | null): void {
    this._correlationId = id;
  }

  log(message: string, context?: string): void {
    this.write('info', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: string, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: string, context?: string): void {
    if (this.isDev) this.write('debug', message, context);
  }

  verbose(message: string, context?: string): void {
    if (this.isDev) this.write('verbose', message, context);
  }

  private write(
    level: string,
    message: string,
    context?: string,
    trace?: string,
  ): void {
    const entry: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      service: 'api',
      context: context ?? 'App',
      message,
    };

    if (this._correlationId) {
      entry['correlationId'] = this._correlationId;
    }
    if (trace) {
      entry['trace'] = trace.slice(0, 1000);
    }

    if (this.isDev) {
      const color = this.levelColor(level);
      const ctx = context ? `[${context}]` : '';
      const corr = this._correlationId ? ` (${this._correlationId})` : '';
      const out = `${color}[${level.toUpperCase()}]${ctx}${corr} ${message}\x1b[0m`;
      if (level === 'error') process.stderr.write(out + '\n');
      else process.stdout.write(out + '\n');
      if (trace) process.stderr.write(trace + '\n');
    } else {
      const line = JSON.stringify(entry) + '\n';
      if (level === 'error') process.stderr.write(line);
      else process.stdout.write(line);
    }
  }

  private levelColor(level: string): string {
    switch (level) {
      case 'error':
        return '\x1b[31m'; // red
      case 'warn':
        return '\x1b[33m'; // yellow
      case 'debug':
        return '\x1b[36m'; // cyan
      case 'verbose':
        return '\x1b[35m'; // magenta
      default:
        return '\x1b[32m'; // green
    }
  }

  setLogLevels?(_levels: LogLevel[]): void {}
}
