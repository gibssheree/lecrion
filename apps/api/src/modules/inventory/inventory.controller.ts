import { Controller, Get, Query, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stats')
  async getStats() {
    return this.inventoryService.getIngredientGlobalStats();
  }

  @Get('low-stock')
  async getLowStock(@Query('threshold') threshold: string) {
    return this.inventoryService.getLowStockIngredients(Number(threshold) || 5);
  }

  @Get('out-of-stock')
  async getOutOfStock(@Query('limit') limit: string) {
    return this.inventoryService.getOutOfStockIngredients(Number(limit) || 100);
  }

  @Get('search')
  async search(@Query('q') q: string) {
    return this.inventoryService.searchIngredientByName(q);
  }

  @Get('pop-ice')
  async getPopIce() {
    return this.inventoryService.getPopIceAvailability();
  }
}
