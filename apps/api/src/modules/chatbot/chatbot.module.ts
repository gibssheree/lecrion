import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { HistoryService } from './history.service';
import { ChatbotController } from './chatbot.controller';

@Module({
  controllers: [ChatbotController],
  providers: [CartService, HistoryService],
  exports: [CartService, HistoryService],
})
export class ChatbotModule {}
