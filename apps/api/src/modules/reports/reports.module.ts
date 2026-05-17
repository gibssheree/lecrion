import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReadModelService } from './read-model.service';
import { PosReportsService } from './pos-reports.service';
import { ReportsController } from './reports.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReadModelService, PosReportsService],
  exports: [ReportsService, ReadModelService, PosReportsService],
})
export class ReportsModule {}
