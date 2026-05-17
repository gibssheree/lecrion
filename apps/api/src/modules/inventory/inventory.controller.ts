import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import {
  InventoryLocationService,
  CreateLocationDto,
} from './inventory-location.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly ledger: InventoryLedgerService,
    private readonly locationService: InventoryLocationService,
  ) {}

  @Get('stats')
  @Roles('owner', 'manager', 'inventory_staff')
  async getStats() {
    return this.inventoryService.getIngredientGlobalStats();
  }

  @Get('low-stock')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async getLowStock(@Query('threshold') threshold: string) {
    return this.inventoryService.getLowStockIngredients(Number(threshold) || 5);
  }

  @Get('out-of-stock')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async getOutOfStock(@Query('limit') limit: string) {
    return this.inventoryService.getOutOfStockIngredients(Number(limit) || 100);
  }

  @Get('search')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async search(@Query('q') q: string) {
    return this.inventoryService.searchIngredientByName(q);
  }

  @Get('pop-ice')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async getPopIce() {
    return this.inventoryService.getPopIceAvailability();
  }

  @Get('movements')
  @Roles('owner', 'manager', 'inventory_staff')
  async getMovements(
    @Query('storeId') storeId: string,
    @Query('changeType') changeType: string,
    @Query('locationId') locationId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    return this.ledger.listMovements({
      storeId: storeId || undefined,
      changeType: changeType || undefined,
      locationId: locationId ? Number(locationId) : undefined,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    });
  }

  @Get('locations')
  @Roles('owner', 'manager', 'inventory_staff')
  async listLocations(@Query('storeId') storeId: string) {
    return this.locationService.listLocations(storeId || undefined);
  }

  @Post('locations')
  @Roles('owner', 'manager')
  async createLocation(@Body() dto: CreateLocationDto) {
    return this.locationService.createLocation(dto);
  }

  @Get('locations/:id')
  @Roles('owner', 'manager', 'inventory_staff')
  async getLocation(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.getLocationById(id);
  }

  @Get('stock')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async getStock(
    @Query('storeId') storeId: string,
    @Query('locationId') locationId: string,
  ) {
    return this.ledger.listStockByLocation(
      storeId || 'default-store',
      locationId ? Number(locationId) : undefined,
    );
  }

  @Get('stock/:menuId')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async getProductStock(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Query('locationId') locationId: string,
  ) {
    return this.ledger.getStockBalances(
      menuId,
      locationId ? Number(locationId) : undefined,
    );
  }
}
