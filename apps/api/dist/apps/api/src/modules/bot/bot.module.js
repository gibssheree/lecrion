"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotModule = void 0;
const common_1 = require("@nestjs/common");
const bot_controller_1 = require("./bot.controller");
const bot_dispatch_service_1 = require("./bot-dispatch.service");
const catalog_module_1 = require("../catalog/catalog.module");
const inventory_module_1 = require("../inventory/inventory.module");
const chatbot_module_1 = require("../chatbot/chatbot.module");
const checkout_module_1 = require("../checkout/checkout.module");
const llm_module_1 = require("../llm/llm.module");
const reports_module_1 = require("../reports/reports.module");
let BotModule = class BotModule {
};
exports.BotModule = BotModule;
exports.BotModule = BotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            catalog_module_1.CatalogModule,
            inventory_module_1.InventoryModule,
            chatbot_module_1.ChatbotModule,
            checkout_module_1.CheckoutModule,
            llm_module_1.LlmModule,
            reports_module_1.ReportsModule,
        ],
        controllers: [bot_controller_1.BotController],
        providers: [bot_dispatch_service_1.BotDispatchService],
    })
], BotModule);
//# sourceMappingURL=bot.module.js.map