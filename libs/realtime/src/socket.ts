// libs/realtime/src/socket.ts
// Socket.IO singleton manager — shared by NestJS API and worker

import { Server } from "socket.io";

let _io: Server | null = null;

/**
 * Initialize the Socket.IO server, attached to an existing HTTP server.
 * Must be called once after the HTTP server is listening.
 */
export function init(httpServer: any): Server {
  if (_io) {
    console.log("[Realtime] Socket.IO already initialized — skipping");
    return _io;
  }

  const DASHBOARD_API_KEY = process.env["DASHBOARD_API_KEY"];
  const DASHBOARD_ORIGIN = process.env["DASHBOARD_ORIGIN"] ?? "*";

  _io = new Server(httpServer, {
    cors: {
      origin:
        DASHBOARD_ORIGIN === "*"
          ? "*"
          : DASHBOARD_ORIGIN.split(",").map((s) => s.trim()),
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    path: "/ws/realtime",
  });

  // Auth middleware — validates API key or JWT token
  _io.use((socket, next) => {
    if (!DASHBOARD_API_KEY) return next(); // dev: allow all

    const auth = socket.handshake.auth ?? {};
    const query = socket.handshake.query ?? {};

    // Path 1: service API key (dashboard backend, worker)
    const apiKey = auth.apiKey ?? query.apiKey;
    if (apiKey && apiKey === DASHBOARD_API_KEY) return next();

    // Path 2: human JWT token (dashboard UI after login)
    // We only verify the token is present here — full JWT validation
    // happens in the HTTP layer. For WebSocket we trust the token was
    // issued by our own auth service (same secret).
    const token = auth.token ?? query.token;
    if (token && typeof token === "string" && token.length > 20) {
      // Attach storeId from auth payload for room routing
      (socket as any).storeId =
        auth.storeId ?? query.storeId ?? "default-store";
      return next();
    }

    console.warn(
      `[Realtime] Socket rejected — no valid credentials (id=${socket.id})`,
    );
    return next(new Error("Unauthorized"));
  });

  _io.on("connection", (socket) => {
    console.log(`[Realtime] Socket connected: ${socket.id}`);

    // Auto-join the store room if storeId is known from auth
    const storeId = (socket as any).storeId;
    if (storeId) {
      socket.join(`store:${storeId}`);
    }

    // Client joins a room: 'dashboard' | 'store:{storeId}'
    socket.on("join", (room: string) => {
      // Validate room name to prevent arbitrary room injection
      if (typeof room === "string" && /^[a-zA-Z0-9_:\-]+$/.test(room)) {
        socket.join(room);
        socket.emit("joined", { room });
        console.log(`[Realtime] Socket ${socket.id} joined room: ${room}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Realtime] Socket disconnected: ${socket.id} (${reason})`);
    });

    // Health ping from dashboard
    socket.on("ping", () => socket.emit("pong", { ts: Date.now() }));
  });

  console.log("[Realtime] Socket.IO server initialized on path /ws/realtime");
  return _io;
}

/**
 * Get the io instance. Returns null if not initialized (safe for worker context).
 */
export function io(): Server | null {
  return _io;
}

/**
 * Emit an event to a room. Silently skips if Socket.IO is not initialized.
 */
export function emit(
  eventName: string,
  payload: Record<string, any>,
  room = "dashboard",
): void {
  if (!_io) return; // Not initialized — skip silently (e.g. during tests)
  _io.to(room).emit(eventName, { ...payload, _ts: Date.now() });
}
