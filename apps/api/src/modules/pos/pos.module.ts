import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { CheckoutModule } from '../checkout/checkout.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [CheckoutModule, ChatbotModule, ReportsModule],
  controllers: [PosController],
})
export class PosModule {}
