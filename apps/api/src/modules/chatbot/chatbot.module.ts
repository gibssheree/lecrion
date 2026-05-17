import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { HistoryService } from './history.service';
import { ChatbotController } from './chatbot.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ChatbotController],
  providers: [CartService, HistoryService],
  exports: [CartService, HistoryService],
})
export class ChatbotModule {}
