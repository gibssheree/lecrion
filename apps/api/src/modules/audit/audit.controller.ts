import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreId } from '../../common/decorators/store-id.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/audit?actor=&resource=&action=&limit=50
   * Returns audit log entries for the caller's own store.
   *
   * SEC-12: this route previously had no @Roles and no store scoping, so
   * RolesGuard let any authenticated user through (it allows all roles when
   * the decorator is absent) and the query returned every store's rows.
   * A cashier at one merchant could read the full audit trail — void
   * reasons, refund amounts, before/after price values — of every other
   * merchant on the platform. Now: owner/manager only, own store only.
   * Cross-store access stays with support via GET /api/admin/audit-logs.
   */
  @Get()
  @Roles('owner', 'manager')
  async getAuditLogs(
    @StoreId() storeId: string,
    @Query('actor') actor?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.auditService.query({
      storeId,
      actor,
      resource,
      action,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return { logs };
  }
}
