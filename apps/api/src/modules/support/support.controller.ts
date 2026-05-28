import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

/**
 * Platform-support endpoints. All require role=support and bypass tenant scope
 * because support operates across all merchants.
 *
 * Note: TenantGuard is intentionally NOT applied — these endpoints span
 * tenants. Authorization is enforced via @Roles('support') alone.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  // ── Audit log viewer ──────────────────────────────────────────────────
  @Get('audit-logs')
  @Roles('support')
  async listAuditLogs(
    @Query('storeId') storeId?: string,
    @Query('actor') actor?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.support.queryAuditLogs({
      storeId,
      actor,
      resource,
      action,
      limit: limit ? parseInt(limit, 10) : 100,
    });
    return { logs };
  }

  // ── System health ─────────────────────────────────────────────────────
  @Get('system/health')
  @Roles('support')
  getSystemHealth() {
    return this.support.getSystemHealth();
  }

  // ── Platform LLM config ───────────────────────────────────────────────
  @Get('llm/config')
  @Roles('support')
  getLlmConfig() {
    return this.support.getLlmPlatformConfig();
  }

  @Patch('llm/config')
  @Roles('support')
  async patchLlmConfig(
    @Body()
    body: Partial<{
      model: string;
      temperature: number;
      maxTokens: number;
      topP: number;
      systemPrompts: Record<string, string>;
    }>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.support.setLlmPlatformConfig(body, user.actor);
    return this.support.getLlmPlatformConfig();
  }

  // ── Verification queue ────────────────────────────────────────────────
  @Get('business-profiles/pending')
  @Roles('support')
  getPendingProfiles() {
    return this.support.getPendingBusinessProfiles();
  }
}
