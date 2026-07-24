// apps/api/src/modules/aggregator/aggregator.module.ts
//
// Phase 2: Order Aggregator Module
//
// Imports AuditModule and SyncModule to support audit trail and outbox events.
// RealtimeModule is a global module injected via infrastructure — no need to import.

import { Module } from '@nestjs/common';
import { AggregatorController } from './aggregator.controller';
import { AggregatorService } from './aggregator.service';
import { AuditModule } from '../audit/audit.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [AuditModule, SyncModule],
  controllers: [AggregatorController],
  providers: [AggregatorService],
  exports: [AggregatorService],
})
export class AggregatorModule {}
