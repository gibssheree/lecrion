import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotDispatchService } from './bot-dispatch.service';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { LlmModule } from '../llm/llm.module';
import { ReportsModule } from '../reports/reports.module';

/**
 * BotModule — NestJS module for the WhatsApp bot integration.
 *
 * Per 03-file-architecture.md: bot is a client of the POS core.
 * All business logic goes through existing NestJS services.
 * The bot only owns: webhook transport, intent detection, response formatting.
 */
@Module({
  imports: [
    CatalogModule,
    InventoryModule,
    ChatbotModule, // CartService + HistoryService
    CheckoutModule, // CheckoutService
    LlmModule, // LlmService + NutritionAdvisorService
    ReportsModule, // ReportsService
  ],
  controllers: [BotController],
  providers: [BotDispatchService],
})
export class BotModule {}
