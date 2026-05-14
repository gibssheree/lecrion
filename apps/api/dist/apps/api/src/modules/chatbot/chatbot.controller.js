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
exports.ChatbotController = void 0;
const common_1 = require("@nestjs/common");
const history_service_1 = require("./history.service");
let ChatbotController = class ChatbotController {
    constructor(historyService) {
        this.historyService = historyService;
    }
    async getHistory(limit) {
        const history = await this.historyService.getEntries(limit ? parseInt(limit, 10) : 50);
        return { history };
    }
    async clearHistory(sender) {
        await this.historyService.clearHistory(decodeURIComponent(sender));
        return { ok: true, sender };
    }
};
exports.ChatbotController = ChatbotController;
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Delete)('history/:sender'),
    __param(0, (0, common_1.Param)('sender')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "clearHistory", null);
exports.ChatbotController = ChatbotController = __decorate([
    (0, common_1.Controller)('chatbot'),
    __metadata("design:paramtypes", [history_service_1.HistoryService])
], ChatbotController);
//# sourceMappingURL=chatbot.controller.js.map