import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryLedgerService } from './inventory-ledger.service';
import { InventoryLocationService } from './inventory-location.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryLedgerService,
    InventoryLocationService,
  ],
  exports: [InventoryService, InventoryLedgerService, InventoryLocationService],
})
export class InventoryModule {}
