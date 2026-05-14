"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosModule = void 0;
const common_1 = require("@nestjs/common");
const pos_controller_1 = require("./pos.controller");
const checkout_module_1 = require("../checkout/checkout.module");
const chatbot_module_1 = require("../chatbot/chatbot.module");
const reports_module_1 = require("../reports/reports.module");
let PosModule = class PosModule {
};
exports.PosModule = PosModule;
exports.PosModule = PosModule = __decorate([
    (0, common_1.Module)({
        imports: [checkout_module_1.CheckoutModule, chatbot_module_1.ChatbotModule, reports_module_1.ReportsModule],
        controllers: [pos_controller_1.PosController],
    })
], PosModule);
//# sourceMappingURL=pos.module.js.map