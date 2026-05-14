"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("./infrastructure/db/database.module");
const config_module_1 = require("./infrastructure/config/config.module");
const sync_module_1 = require("./modules/sync/sync.module");
const realtime_module_1 = require("./infrastructure/realtime/realtime.module");
const auth_module_1 = require("./modules/auth/auth.module");
const audit_module_1 = require("./modules/audit/audit.module");
const users_module_1 = require("./modules/users/users.module");
const tenants_module_1 = require("./modules/tenants/tenants.module");
const stores_module_1 = require("./modules/stores/stores.module");
const catalog_module_1 = require("./modules/catalog/catalog.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const chatbot_module_1 = require("./modules/chatbot/chatbot.module");
const checkout_module_1 = require("./modules/checkout/checkout.module");
const orders_module_1 = require("./modules/orders/orders.module");
const payments_module_1 = require("./modules/payments/payments.module");
const cashflow_module_1 = require("./modules/cashflow/cashflow.module");
const register_module_1 = require("./modules/register/register.module");
const llm_module_1 = require("./modules/llm/llm.module");
const reports_module_1 = require("./modules/reports/reports.module");
const health_module_1 = require("./modules/health/health.module");
const bot_module_1 = require("./modules/bot/bot.module");
const pos_module_1 = require("./modules/pos/pos.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            config_module_1.ConfigModule,
            sync_module_1.SyncModule,
            realtime_module_1.RealtimeModule,
            auth_module_1.AuthModule,
            audit_module_1.AuditModule,
            users_module_1.UsersModule,
            tenants_module_1.TenantsModule,
            stores_module_1.StoresModule,
            catalog_module_1.CatalogModule,
            inventory_module_1.InventoryModule,
            chatbot_module_1.ChatbotModule,
            checkout_module_1.CheckoutModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            cashflow_module_1.CashflowModule,
            register_module_1.RegisterModule,
            llm_module_1.LlmModule,
            reports_module_1.ReportsModule,
            health_module_1.HealthModule,
            bot_module_1.BotModule,
            pos_module_1.PosModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map