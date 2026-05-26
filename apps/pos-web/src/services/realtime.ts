// apps/pos-web/src/services/realtime.ts
// Socket.IO client for POS realtime events

import { useAuthStore } from "../store/auth.store";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";
const DEFAULT_STORE_ID = "default-store";
const API_KEY =
  (
    import.meta as {
      env?: { VITE_DASHBOARD_API_KEY?: string };
    }
  ).env?.VITE_DASHBOARD_API_KEY ?? "";

let _socket: Socket | null = null;

function getStoredPosToken(): string | null {
  const sessionToken = sessionStorage.getItem("pos_token");
  if (sessionToken) return sessionToken;

  try {
    const persisted = JSON.parse(localStorage.getItem("pos-auth") ?? "{}");
    return persisted?.state?.token ?? null;
  } catch {
    return null;
  }
}

function buildSocketAuth(): Record<string, string> {
  const auth: Record<string, string> = {
    storeId: useAuthStore.getState().user?.storeId ?? DEFAULT_STORE_ID,
  };
  const token = getStoredPosToken();

  if (token) {
    if (!sessionStorage.getItem("pos_token")) {
      sessionStorage.setItem("pos_token", token);
    }
    auth.token = token;
  } else if (API_KEY) {
    auth.apiKey = API_KEY;
  }

  return auth;
}

export function getSocket(): Socket {
  // Return the existing socket even when disconnected — Socket.IO's built-in
  // reconnection will bring it back. Creating a NEW socket on every call when
  // disconnected was the bug: each caller (useSocket, PosAppShell, etc.) would
  // spawn its own socket, all failing in parallel → perpetual "connecting" loop.
  if (_socket) return _socket;

  _socket = io(SOCKET_URL, {
    path: "/ws/realtime",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    auth: buildSocketAuth(),
  });

  _socket.on("connect", () => {
    const storeId = useAuthStore.getState().user?.storeId ?? DEFAULT_STORE_ID;
    _socket!.emit("join", "dashboard");
    _socket!.emit("join", `store:${storeId}`);
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
