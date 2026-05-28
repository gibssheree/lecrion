import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosSalesService } from './pos-sales.service';
import { PosCorrectionsService } from './pos-corrections.service';
import { PosApprovalService } from './pos-approval.service';
import { PosCalculationService } from './pos-calculation.service';
import { PosSessionService } from './pos-session.service';
import { CheckoutModule } from '../checkout/checkout.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { ReportsModule } from '../reports/reports.module';
import { UsersModule } from '../users/users.module';
import { SyncModule } from '../sync/sync.module';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StoresModule } from '../stores/stores.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CheckoutModule,
    ChatbotModule,
    ReportsModule,
    UsersModule,
    SyncModule,
    AuditModule,
    InventoryModule,
    StoresModule,
    AuthModule,
  ],
  controllers: [PosController],
  providers: [
    PosSalesService,
    PosCorrectionsService,
    PosApprovalService,
    PosCalculationService,
    PosSessionService,
  ],
  exports: [
    PosSalesService,
    PosCorrectionsService,
    PosApprovalService,
    PosCalculationService,
    PosSessionService,
  ],
})
export class PosModule {}
