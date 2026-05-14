"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
exports.io = io;
exports.emit = emit;
const socket_io_1 = require("socket.io");
let _io = null;
function init(httpServer) {
    if (_io) {
        console.log("[Realtime] Socket.IO already initialized — skipping");
        return _io;
    }
    const DASHBOARD_API_KEY = process.env["DASHBOARD_API_KEY"];
    const DASHBOARD_ORIGIN = process.env["DASHBOARD_ORIGIN"] ?? "*";
    _io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: DASHBOARD_ORIGIN === "*"
                ? "*"
                : DASHBOARD_ORIGIN.split(",").map((s) => s.trim()),
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
        path: "/ws/realtime",
    });
    _io.use((socket, next) => {
        if (!DASHBOARD_API_KEY)
            return next();
        const auth = socket.handshake.auth ?? {};
        const query = socket.handshake.query ?? {};
        const apiKey = auth.apiKey ?? query.apiKey;
        if (apiKey && apiKey === DASHBOARD_API_KEY)
            return next();
        const token = auth.token ?? query.token;
        if (token && typeof token === "string" && token.length > 20) {
            socket.storeId =
                auth.storeId ?? query.storeId ?? "default-store";
            return next();
        }
        console.warn(`[Realtime] Socket rejected — no valid credentials (id=${socket.id})`);
        return next(new Error("Unauthorized"));
    });
    _io.on("connection", (socket) => {
        console.log(`[Realtime] Socket connected: ${socket.id}`);
        const storeId = socket.storeId;
        if (storeId) {
            socket.join(`store:${storeId}`);
        }
        socket.on("join", (room) => {
            if (typeof room === "string" && /^[a-zA-Z0-9_:\-]+$/.test(room)) {
                socket.join(room);
                socket.emit("joined", { room });
                console.log(`[Realtime] Socket ${socket.id} joined room: ${room}`);
            }
        });
        socket.on("disconnect", (reason) => {
            console.log(`[Realtime] Socket disconnected: ${socket.id} (${reason})`);
        });
        socket.on("ping", () => socket.emit("pong", { ts: Date.now() }));
    });
    console.log("[Realtime] Socket.IO server initialized on path /ws/realtime");
    return _io;
}
function io() {
    return _io;
}
function emit(eventName, payload, room = "dashboard") {
    if (!_io)
        return;
    _io.to(room).emit(eventName, { ...payload, _ts: Date.now() });
}
//# sourceMappingURL=socket.js.map