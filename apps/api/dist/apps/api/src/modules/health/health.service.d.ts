import { PrismaService } from '@libs/db/src/prisma';
export type HealthStatus = 'ok' | 'degraded' | 'unhealthy';
export interface CheckResult {
    status: 'ok' | 'fail';
    latencyMs: number;
    error?: string;
}
export interface HealthReport {
    status: HealthStatus;
    service: string;
    version: string;
    uptime: number;
    memoryMb: number;
    timestamp: string;
    checks: Record<string, CheckResult>;
}
export declare class HealthService {
    private readonly prisma;
    private readonly logger;
    private readonly startTime;
    constructor(prisma: PrismaService);
    check(): Promise<HealthReport>;
    metrics(): string;
}
