import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { IdempotencyService } from './idempotency.service';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [ChatbotModule, UsersModule, AuditModule, SyncModule],
  providers: [CheckoutService, IdempotencyService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
