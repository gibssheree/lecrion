"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastToRoom = broadcastToRoom;
const socket_1 = require("./socket");
function broadcastToRoom(room, eventName, payload) {
    const server = (0, socket_1.io)();
    if (!server)
        return;
    server.to(room).emit(eventName, { ...payload, _ts: Date.now() });
}
//# sourceMappingURL=subscribers.js.map