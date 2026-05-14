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
exports.PosController = void 0;
const common_1 = require("@nestjs/common");
const checkout_service_1 = require("../checkout/checkout.service");
const cart_service_1 = require("../chatbot/cart.service");
const read_model_service_1 = require("../reports/read-model.service");
let PosController = class PosController {
    constructor(checkoutService, cartService, readModelService) {
        this.checkoutService = checkoutService;
        this.cartService = cartService;
        this.readModelService = readModelService;
    }
    async checkout(dto) {
        const { items, paymentMethod, cashierId, customerName } = dto;
        if (!items?.length) {
            throw new Error('Tidak ada item dalam pesanan');
        }
        const sender = `pos:${cashierId}`;
        await this.cartService.saveCart(sender, items.map((item) => ({
            productId: item.productId,
            name: item.name,
            qty: item.qty,
            price: item.price,
        })));
        const result = await this.checkoutService.createOrderFromCart({
            sender,
            customerName: customerName || `POS-${cashierId}`,
            orderType: 'pickup',
            correlationId: `pos-${Date.now()}`,
        });
        this.readModelService.rebuildAll().catch(() => {
        });
        return {
            orderId: result.orderId,
            total: result.total,
            items: result.items,
            paymentMethod,
        };
    }
};
exports.PosController = PosController;
__decorate([
    (0, common_1.Post)('checkout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PosController.prototype, "checkout", null);
exports.PosController = PosController = __decorate([
    (0, common_1.Controller)('pos'),
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService,
        cart_service_1.CartService,
        read_model_service_1.ReadModelService])
], PosController);
//# sourceMappingURL=pos.controller.js.map