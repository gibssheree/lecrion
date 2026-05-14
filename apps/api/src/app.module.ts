import { Module } from '@nestjs/common';

// Infrastructure
import { DatabaseModule } from './infrastructure/db/database.module';
import { ConfigModule } from './infrastructure/config/config.module';
import { SyncModule } from './modules/sync/sync.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';

// Security & Auth
import { AuthModule } from './modules/auth/auth.module';

// Domain modules
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { StoresModule } from './modules/stores/stores.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CashflowModule } from './modules/cashflow/cashflow.module';
import { RegisterModule } from './modules/register/register.module';
import { LlmModule } from './modules/llm/llm.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthModule } from './modules/health/health.module';
import { BotModule } from './modules/bot/bot.module';
import { PosModule } from './modules/pos/pos.module';

@Module({
  imports: [
    // Infrastructure (global)
    DatabaseModule,
    ConfigModule,
    SyncModule,
    RealtimeModule,

    // Auth (must come before domain modules that use guards)
    AuthModule,

    // Core domain
    AuditModule,
    UsersModule,
    TenantsModule,
    StoresModule,
    CatalogModule,
    InventoryModule,
    ChatbotModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    CashflowModule,
    RegisterModule,
    LlmModule,
    ReportsModule,
    HealthModule,
    BotModule,
    PosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
