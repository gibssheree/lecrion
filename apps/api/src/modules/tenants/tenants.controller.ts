import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('owner')
  listTenants() {
    return this.tenantsService.listTenants();
  }

  @Get('context')
  @Roles('owner', 'manager', 'cashier')
  getTenantContext(@CurrentUser() user: AuthUser) {
    return {
      tenantId: user.tenantId,
      storeId: user.storeId,
      channel: this.tenantsService.buildRealtimeChannel(user.storeId),
    };
  }
}
