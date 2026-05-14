export declare function redact(obj: any, depth?: number): any;
export interface ServiceLogger {
    error(msg: string, meta?: Record<string, any>): void;
    warn(msg: string, meta?: Record<string, any>): void;
    info(msg: string, meta?: Record<string, any>): void;
    debug(msg: string, meta?: Record<string, any>): void;
    child(childMeta: Record<string, any>): ServiceLogger;
    exception(err: Error, meta?: Record<string, any>): void;
    setCorrelationId(id: string): void;
    clearCorrelationId(): void;
}
export declare function createServiceLogger(serviceName: string, defaultMeta?: Record<string, any>): ServiceLogger;
export declare const getLogger: (service: string) => ServiceLogger;
