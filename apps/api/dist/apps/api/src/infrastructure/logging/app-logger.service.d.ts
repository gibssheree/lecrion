import { LoggerService, LogLevel } from '@nestjs/common';
export declare class AppLoggerService implements LoggerService {
    private readonly isDev;
    private _correlationId;
    setCorrelationId(id: string | null): void;
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
    private write;
    private levelColor;
    setLogLevels?(_levels: LogLevel[]): void;
}
