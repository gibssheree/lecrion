// apps/pos-web/src/services/realtime.ts
// Socket.IO client for POS realtime events

import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (_socket?.connected) return _socket;

  _socket = io(SOCKET_URL, {
    path: "/ws/realtime",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    auth: { apiKey: "" },
  });

  _socket.on("connect", () => {
    _socket!.emit("join", "dashboard");
    console.log("[POS Realtime] Connected");
  });

  _socket.on("disconnect", (reason) => {
    console.log("[POS Realtime] Disconnected:", reason);
  });

  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
