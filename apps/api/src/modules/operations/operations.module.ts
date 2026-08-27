import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { AuditModule } from '../audit/audit.module';
import { SyncModule } from '../sync/sync.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';
import { StoresModule } from '../stores/stores.module';

@Module({
  imports: [AuditModule, SyncModule, InventoryModule, AuthModule, StoresModule],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
