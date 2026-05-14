"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RealtimeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const common_1 = require("@nestjs/common");
const socketLib = require("../../../../../libs/realtime/src/socket");
const publishers = require("../../../../../libs/realtime/src/publishers");
let RealtimeService = RealtimeService_1 = class RealtimeService {
    constructor() {
        this.logger = new common_1.Logger(RealtimeService_1.name);
    }
    init(httpServer) {
        socketLib.init(httpServer);
        this.logger.log('Socket.IO server initialized on /ws/realtime');
    }
    emit(eventName, payload, room = 'dashboard') {
        socketLib.emit(eventName, payload, room);
    }
    emitOrderCreated(order) {
        publishers.emitOrderCreated(order);
    }
    emitOrderStatusChanged(orderId, oldStatus, newStatus) {
        publishers.emitOrderStatusChanged(orderId, oldStatus, newStatus);
    }
    emitStockAlert(product) {
        publishers.emitStockAlert(product);
    }
    emitLowStockBatch(products) {
        publishers.emitLowStockBatch(products);
    }
    emitInboxEvent(inboxRow) {
        publishers.emitInboxEvent(inboxRow);
    }
    emitNotification(notification) {
        publishers.emitNotification(notification);
    }
};
exports.RealtimeService = RealtimeService;
exports.RealtimeService = RealtimeService = RealtimeService_1 = __decorate([
    (0, common_1.Injectable)()
], RealtimeService);
//# sourceMappingURL=realtime.service.js.map