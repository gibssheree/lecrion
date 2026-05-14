import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @StoreId() — injects the resolved storeId from the request context.
 * Set by TenantGuard from X-Store-Id header or JWT claim.
 *
 * Usage:
 *   @Get('orders')
 *   @UseGuards(JwtAuthGuard, TenantGuard)
 *   listOrders(@StoreId() storeId: string) {}
 */
export const StoreId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.storeId ?? req.user?.storeId ?? 'default-store';
  },
);

/**
 * @TenantId() — injects the resolved tenantId from the request context.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.tenantId ?? req.user?.tenantId ?? 'default';
  },
);
