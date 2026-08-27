import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('info')
  getStoreInfo(@StoreId() storeId: string) {
    return this.storesService.getStoreInfo(storeId);
  }

  @Get('capabilities')
  getCapabilities(@StoreId() storeId: string) {
    return this.storesService.getCapabilities(storeId);
  }

  @Get('business-profile')
  @Roles('owner', 'manager')
  getBusinessProfile(@StoreId() storeId: string) {
    return this.storesService.getBusinessProfile(storeId);
  }

  @Post('business-profile/request')
  @Roles('owner', 'manager')
  requestBusinessProfile(
    @Body() body: { businessVertical: string; notes?: string },
    @StoreId() storeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.requestBusinessVertical({
      storeId,
      requestedBusinessVertical: body.businessVertical,
      actor: user.actor,
      notes: body.notes,
    });
  }

  @Get('settings')
  @Roles('owner', 'manager')
  getSettings(@StoreId() storeId: string) {
    return this.storesService.getSettings(storeId);
  }

  @Post('settings')
  @Roles('owner', 'manager')
  setSettings(
    @Body() body: Record<string, string>,
    @StoreId() storeId: string,
  ) {
    return this.storesService
      .setSettings(body, storeId)
      .then(() => ({ ok: true, storeId }));
  }

  @Post('settings/:key')
  @Roles('owner', 'manager')
  setSetting(
    @Param('key') key: string,
    @Body() body: { value: string },
    @StoreId() storeId: string,
  ) {
    return this.storesService
      .setSetting(key, body.value, storeId)
      .then(() => ({ ok: true, key, storeId }));
  }

  @Get('settings/:key')
  @Roles('owner', 'manager')
  getSetting(
    @Param('key') key: string,
    @Query('default') defaultValue: string | undefined,
    @StoreId() storeId: string,
  ) {
    return this.storesService
      .getSetting(key, defaultValue, storeId)
      .then((value) => ({ key, value, storeId }));
  }

  @Delete('settings/:key')
  @Roles('owner')
  deleteSetting(@Param('key') key: string, @StoreId() storeId: string) {
    return this.storesService
      .deleteSetting(key, storeId)
      .then(() => ({ ok: true, key, storeId }));
  }

  /**
   * GET /api/stores/calc-policy
   *
   * Returns the store's calculation policy for the POS frontend.
   * Cashiers (and above) can read this — no owner/manager restriction.
   * Values are parsed and safe (no raw strings).
   */
  @Get('calc-policy')
  getCalcPolicy(@StoreId() storeId: string) {
    return this.storesService.getCalcPolicy(storeId);
  }
}

@Controller('admin/stores')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AdminStoresController {
  constructor(private readonly storesService: StoresService) {}

  // ── Platform-wide list ──────────────────────────────────────────────────
  @Get()
  @Roles('support')
  listAllStores(
    @Query('status') status?: string,
    @Query('vertical') vertical?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.listAllStores({
      status,
      vertical,
      q,
      limit: limit ? Math.max(1, Number(limit) || 100) : undefined,
    });
  }

  @Get(':storeId/capabilities')
  @Roles('support')
  getAdminCapabilities(@Param('storeId') storeId: string) {
    return this.storesService.getCapabilities(storeId);
  }

  @Get(':storeId/business-profile')
  @Roles('support')
  getAdminBusinessProfile(@Param('storeId') storeId: string) {
    return this.storesService.getBusinessProfile(storeId);
  }

  @Get(':storeId/activity')
  @Roles('support')
  getAdminActivity(@Param('storeId') storeId: string) {
    return this.storesService.getStoreActivity(storeId);
  }

  @Get(':storeId/users')
  @Roles('support')
  getAdminStoreUsers(@Param('storeId') storeId: string) {
    return this.storesService.listStoreUsers(storeId);
  }

  @Patch(':storeId/business-profile/verify')
  @Roles('support')
  verifyBusinessProfile(
    @Param('storeId') storeId: string,
    @Body() body: { businessVertical: string; notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.verifyBusinessProfile({
      storeId,
      businessVertical: body.businessVertical,
      verifiedBy: user.actor,
      notes: body.notes,
    });
  }

  @Patch(':storeId/tier')
  @Roles('support')
  setStoreTier(
    @Param('storeId') storeId: string,
    @Body() body: { tier: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.setStoreTier({
      storeId,
      tier: body.tier,
      updatedBy: user.actor,
    });
  }

  @Patch(':storeId/modules/:moduleKey')
  @Roles('support')
  setModuleOverride(
    @Param('storeId') storeId: string,
    @Param('moduleKey') moduleKey: string,
    @Body() body: { enabled: boolean; reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.setModuleOverride({
      storeId,
      moduleKey,
      enabled: Boolean(body.enabled),
      reason: body.reason,
      updatedBy: user.actor,
    });
  }
}
