import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReadModelService } from './read-model.service';
import { PosReportsService } from './pos-reports.service';
import { ReportsController } from './reports.controller';
import { AuthModule } from '../auth/auth.module';
import { StoresModule } from '../stores/stores.module';
import { ModuleCapabilityGuard } from '../../common/guards/module-capability.guard';

@Module({
  // StoresModule + the guard provider are required by ReportsController's
  // @UseGuards(ModuleCapabilityGuard) — without them Nest cannot resolve
  // StoresService and the whole application fails to bootstrap.
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
