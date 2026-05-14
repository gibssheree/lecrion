import {
  Controller,
  Get,
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

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('info')
  getStoreInfo(@StoreId() storeId: string) {
    return this.storesService.getStoreInfo(storeId);
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
}
