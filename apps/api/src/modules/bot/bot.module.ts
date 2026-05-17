import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotDispatchService } from './bot-dispatch.service';
import { ScheduledReportsService } from './scheduled-reports.service';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { LlmModule } from '../llm/llm.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    CatalogModule,
    InventoryModule,
    ChatbotModule,
    CheckoutModule,
    LlmModule,
    ReportsModule,
  ],
  controllers: [BotController],
  providers: [BotDispatchService, ScheduledReportsService],
  exports: [ScheduledReportsService],
})
export class BotModule {}
