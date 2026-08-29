import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReadModelService } from './read-model.service';
import { PosReportsService } from './pos-reports.service';
import { ReportsController } from './reports.controller';
import { AuthModule } from '../auth/auth.module';
import { StoresModule } from '../stores/stores.module';
import { ModuleCapabilityGuard } from '../../common/guards/module-capability.guard';

@Module({
  // StoresModule supplies StoresService, which ModuleCapabilityGuard injects
  // to resolve a store's enabled modules (see @RequireModule usages in
  // ReportsController).
  imports: [AuthModule, StoresModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReadModelService,
    PosReportsService,
    ModuleCapabilityGuard,
  ],
  exports: [ReportsService, ReadModelService, PosReportsService],
})
export class ReportsModule {}
