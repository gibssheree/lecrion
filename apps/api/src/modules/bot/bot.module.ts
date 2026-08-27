import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotDispatchService } from './bot-dispatch.service';
import { BotRoutingService } from './bot-routing.service';
import { ScheduledReportsService } from './scheduled-reports.service';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { LlmModule } from '../llm/llm.module';
import { ReportsModule } from '../reports/reports.module';
import { StoresModule } from '../stores/stores.module';

@Module({
  imports: [
    CatalogModule,
    InventoryModule,
    ChatbotModule,
    CheckoutModule,
    LlmModule,
    ReportsModule,
    StoresModule,
  ],
  controllers: [BotController],
  providers: [BotDispatchService, BotRoutingService, ScheduledReportsService],
  exports: [ScheduledReportsService, BotRoutingService],
})
export class BotModule {}
