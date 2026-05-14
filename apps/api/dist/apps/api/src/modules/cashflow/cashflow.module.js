"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashflowModule = void 0;
const common_1 = require("@nestjs/common");
const cashflow_service_1 = require("./cashflow.service");
const cashflow_controller_1 = require("./cashflow.controller");
const audit_module_1 = require("../audit/audit.module");
let CashflowModule = class CashflowModule {
};
exports.CashflowModule = CashflowModule;
exports.CashflowModule = CashflowModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule],
        controllers: [cashflow_controller_1.CashflowController],
        providers: [cashflow_service_1.CashflowService],
        exports: [cashflow_service_1.CashflowService],
    })
], CashflowModule);
//# sourceMappingURL=cashflow.module.js.map