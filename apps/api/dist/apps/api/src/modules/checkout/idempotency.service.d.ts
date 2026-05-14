import { PrismaService } from '@libs/db/src/prisma';
export declare class IdempotencyService {
    private readonly prisma;
    private readonly TTL_SECONDS;
    private _lastCleanup;
    constructor(prisma: PrismaService);
    private maybeCleanup;
    check(key: string): Promise<any | null>;
    save(key: string, result: any): Promise<void>;
    buildCheckoutKey(sender: string, cartItemIds: number[]): string;
}
