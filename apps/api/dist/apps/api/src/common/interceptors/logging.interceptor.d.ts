import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppLoggerService } from '../../infrastructure/logging/app-logger.service';
export declare class LoggingInterceptor implements NestInterceptor {
    private readonly appLogger?;
    private readonly logger;
    private readonly SKIP_PATHS;
    constructor(appLogger?: AppLoggerService | undefined);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
