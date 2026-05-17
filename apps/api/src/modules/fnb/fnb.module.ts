import { Module } from '@nestjs/common';
import { FnbController } from './fnb.controller';
import { TablesService } from './tables.service';
import { KitchenService } from './kitchen.service';
import { StoresModule } from '../stores/stores.module';
import { ModuleCapabilityGuard } from '../../common/guards/module-capability.guard';

@Module({
  imports: [StoresModule],
  controllers: [FnbController],
  providers: [TablesService, KitchenService, ModuleCapabilityGuard],
  exports: [TablesService, KitchenService],
})
export class FnbModule {}
