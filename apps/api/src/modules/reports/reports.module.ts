import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReadModelService } from './read-model.service';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReadModelService],
  exports: [ReportsService, ReadModelService],
})
export class ReportsModule {}
