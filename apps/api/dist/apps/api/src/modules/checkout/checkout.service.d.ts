import { PrismaService } from '@libs/db/src/prisma';
import { CartService } from '../chatbot/cart.service';
import { IdempotencyService } from './idempotency.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
export declare class CheckoutService {
    private readonly prisma;
    private readonly cartService;
    private readonly idempotencyService;
    private readonly usersService;
    private readonly auditService;
    private readonly syncService;
    private readonly realtimeService;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, cartService: CartService, idempotencyService: IdempotencyService, usersService: UsersService, auditService: AuditService, syncService: SyncService, realtimeService: RealtimeService, configService: AppConfigService);
    formatRupiah(v: number): string;
    sanitizePhone(s: string): string;
    createOrderFromCart(opts: {
        sender: string;
        customerName?: string;
        orderType?: string;
        phone?: string;
        address?: string;
        idempotencyKey?: string;
        correlationId?: string;
    }): Promise<any>;
    formatCheckoutSuccess(order: any): string;
}
