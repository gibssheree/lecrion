"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantId = exports.StoreId = void 0;
const common_1 = require("@nestjs/common");
exports.StoreId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.storeId ?? req.user?.storeId ?? 'default-store';
});
exports.TenantId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.tenantId ?? req.user?.tenantId ?? 'default';
});
//# sourceMappingURL=store-id.decorator.js.map