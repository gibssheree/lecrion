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
exports.RegisterController = void 0;
const common_1 = require("@nestjs/common");
const register_service_1 = require("./register.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let RegisterController = class RegisterController {
    constructor(registerService) {
        this.registerService = registerService;
    }
    openSession(dto) {
        return this.registerService.openSession(dto);
    }
    closeSession(dto) {
        return this.registerService.closeSession(dto);
    }
    suspendSession(id, user) {
        return this.registerService.suspendSession(id, user.actor);
    }
    resumeSession(id, user) {
        return this.registerService.resumeSession(id, user.actor);
    }
    getActiveSession(storeId) {
        return this.registerService.getActiveSession(storeId);
    }
    listSessions(storeId, limit) {
        return this.registerService.listSessions(storeId, limit ? parseInt(limit, 10) : 20);
    }
    getSessionById(id) {
        return this.registerService.getSessionById(id);
    }
    getSessionBalance(id) {
        return this.registerService
            .getSessionBalance(id)
            .then((balance) => ({ sessionId: id, balance }));
    }
};
exports.RegisterController = RegisterController;
__decorate([
    (0, common_1.Post)('open'),
    (0, roles_decorator_1.Roles)('owner', 'manager', 'cashier'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RegisterController.prototype, "openSession", null);
__decorate([
    (0, common_1.Post)('close'),
    (0, roles_decorator_1.Roles)('owner', 'manager', 'cashier'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RegisterController.prototype, "closeSession", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    (0, roles_decorator_1.Roles)('owner', 'manager', 'cashier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], RegisterController.prototype, "suspendSession", null);
__decorate([
    (0, common_1.Post)(':id/resume'),
    (0, roles_decorator_1.Roles)('owner', 'manager', 'cashier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], RegisterController.prototype, "resumeSession", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, roles_decorator_1.Roles)('owner', 'manager', 'cashier'),
    __param(0, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RegisterController.prototype, "getActiveSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, roles_decorator_1.Roles)('owner', 'manager', 'cashier'),
    __param(0, (0, common_1.Query)('storeId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RegisterController.prototype, "listSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    (0, roles_decorator_1.Roles)('owner', 'manager', 'cashier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RegisterController.prototype, "getSessionById", null);
__decorate([
    (0, common_1.Get)('sessions/:id/balance'),
    (0, roles_decorator_1.Roles)('owner', 'manager', 'cashier'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], RegisterController.prototype, "getSessionBalance", null);
exports.RegisterController = RegisterController = __decorate([
    (0, common_1.Controller)('register'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [register_service_1.RegisterService])
], RegisterController);
//# sourceMappingURL=register.controller.js.map