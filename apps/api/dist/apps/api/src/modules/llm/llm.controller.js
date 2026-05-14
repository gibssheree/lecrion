"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmController = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("./llm.service");
const TOOL_DEFINITIONS = [
    {
        name: 'check_product_stock',
        description: 'Check current stock and price of a product by name or partial name.',
        readOnly: true,
        parameters: {
            name: {
                type: 'string',
                description: 'Product name or partial name to search',
                required: true,
            },
        },
    },
    {
        name: 'get_order_status',
        description: 'Get the current status of an order by order ID.',
        readOnly: true,
        parameters: {
            orderId: {
                type: 'number',
                description: 'The order ID to look up',
                required: true,
            },
        },
    },
    {
        name: 'list_open_orders',
        description: 'List all currently open or pending orders for the store.',
        readOnly: true,
        parameters: {
            limit: {
                type: 'number',
                description: 'Maximum number of orders to return (default 10)',
                required: false,
            },
        },
    },
    {
        name: 'get_daily_sales_summary',
        description: "Get today's sales summary: total revenue, order count, top selling items.",
        readOnly: true,
        parameters: {},
    },
    {
        name: 'search_customer_history',
        description: 'Get recent order history for a customer by their phone number.',
        readOnly: true,
        parameters: {
            phone: {
                type: 'string',
                description: 'Customer phone number (digits only)',
                required: true,
            },
        },
    },
];
let LlmController = class LlmController {
    constructor(llmService) {
        this.llmService = llmService;
    }
    async chat(body) {
        const { message, role = 'admin', sender = 'dashboard-console' } = body;
        if (!message?.trim()) {
            return { reply: 'Pesan tidak boleh kosong.' };
        }
        const reply = await this.llmService.chat({
            sender,
            message: message.trim(),
            role,
            history: [],
            context: {},
        });
        return { reply };
    }
    getTools() {
        return { tools: TOOL_DEFINITIONS };
    }
};
exports.LlmController = LlmController;
__decorate([
    (0, common_1.Post)('chat'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LlmController.prototype, "chat", null);
__decorate([
    (0, common_1.Get)('tools'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LlmController.prototype, "getTools", null);
exports.LlmController = LlmController = __decorate([
    (0, common_1.Controller)('llm'),
    __metadata("design:paramtypes", [llm_service_1.LlmService])
], LlmController);
//# sourceMappingURL=llm.controller.js.map