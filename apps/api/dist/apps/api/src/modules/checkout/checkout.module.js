"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutModule = void 0;
const common_1 = require("@nestjs/common");
const checkout_service_1 = require("./checkout.service");
const idempotency_service_1 = require("./idempotency.service");
const chatbot_module_1 = require("../chatbot/chatbot.module");
const users_module_1 = require("../users/users.module");
const audit_module_1 = require("../audit/audit.module");
const sync_module_1 = require("../sync/sync.module");
let CheckoutModule = class CheckoutModule {
};
exports.CheckoutModule = CheckoutModule;
exports.CheckoutModule = CheckoutModule = __decorate([
    (0, common_1.Module)({
        imports: [chatbot_module_1.ChatbotModule, users_module_1.UsersModule, audit_module_1.AuditModule, sync_module_1.SyncModule],
        providers: [checkout_service_1.CheckoutService, idempotency_service_1.IdempotencyService],
        exports: [checkout_service_1.CheckoutService],
    })
], CheckoutModule);
//# sourceMappingURL=checkout.module.js.map