import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { InventoryLocationService } from './inventory-location.service';
import { StockOpnameService } from './stock-opname.service';
import { StockOpnameController } from './stock-opname.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [InventoryController, StockOpnameController],
  providers: [
    InventoryService,
    InventoryLedgerService,
    InventoryLocationService,
    StockOpnameService,
  ],
  exports: [
    InventoryService,
    InventoryLedgerService,
    InventoryLocationService,
    StockOpnameService,
  ],
})
export class InventoryModule {}
