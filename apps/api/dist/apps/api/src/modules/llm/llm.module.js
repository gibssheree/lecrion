"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmModule = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("./llm.service");
const llm_adapter_service_1 = require("./llm-adapter.service");
const prompt_templates_service_1 = require("./prompt-templates.service");
const llm_tools_service_1 = require("./llm-tools.service");
const nutrition_advisor_service_1 = require("./nutrition-advisor.service");
const llm_controller_1 = require("./llm.controller");
const audit_module_1 = require("../audit/audit.module");
let LlmModule = class LlmModule {
};
exports.LlmModule = LlmModule;
exports.LlmModule = LlmModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule],
        controllers: [llm_controller_1.LlmController],
        providers: [
            llm_service_1.LlmService,
            llm_adapter_service_1.LlmAdapterService,
            prompt_templates_service_1.PromptTemplatesService,
            llm_tools_service_1.LlmToolsService,
            nutrition_advisor_service_1.NutritionAdvisorService,
        ],
        exports: [llm_service_1.LlmService, nutrition_advisor_service_1.NutritionAdvisorService],
    })
], LlmModule);
//# sourceMappingURL=llm.module.js.map