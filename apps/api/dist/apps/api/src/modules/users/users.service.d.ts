import { PrismaService } from '@libs/db/src/prisma';
export declare class UsersService {
    private readonly prisma;
    private readonly DEFAULT_PASSWORD_HASH;
    constructor(prisma: PrismaService);
    extractDigits(value: string): string;
    normalizePhoneFromWa(value: string): string;
    buildWaEmail(phoneDigits: string): string;
    ensureUserByPhone(waPhone: string, tx?: any): Promise<{
        userId: any;
        phoneDigits: string;
        email: string;
        created: boolean;
    }>;
}
