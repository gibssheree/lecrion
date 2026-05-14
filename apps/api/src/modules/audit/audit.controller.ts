import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/audit?actor=&resource=&action=&limit=50
   * Returns audit log entries for the dashboard.
   */
  @Get()
  async getAuditLogs(
    @Query('actor') actor?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.auditService.query({
      actor,
      resource,
      action,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return { logs };
  }
}
