import { useState, useEffect, useRef, useCallback } from "react";
import { io as socketIo, Socket } from "socket.io-client";
import { getStoredToken } from "../services/api";

export interface SocketEvent {
  eventName: string;
  data: Record<string, unknown>;
  receivedAt: number;
}

interface UseSocketResult {
  connected: boolean;
  events: SocketEvent[];
  lastEvent: SocketEvent | null;
}

// Singleton socket — shared across all useSocket() calls in the same session.
// Re-created if the auth token changes (e.g. after login).
let _socket: Socket | null = null;
const _listeners: Record<string, (data: unknown) => void> = {};

const API_KEY = import.meta.env.VITE_DASHBOARD_API_KEY ?? "";
const STORE_ID = import.meta.env.VITE_DEFAULT_STORE_ID ?? "default-store";

/**
 * Build the socket auth payload.
 *
 * The API's JwtAuthGuard checks X-Api-Key on HTTP requests.
 * For WebSocket connections, Socket.IO passes the `auth` object as
 * handshake data — the server reads it from socket.handshake.auth.
 *
 * Priority: human JWT > service API key (same as HTTP auth).
 */
function buildSocketAuth(): Record<string, string> {
  const jwt = getStoredToken();
  return jwt
    ? { token: jwt, storeId: STORE_ID }
    : { apiKey: API_KEY, storeId: STORE_ID };
}

function getSocket(): Socket {
  if (_socket?.connected) return _socket;

  const SOCKET_URL =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  _socket = socketIo(SOCKET_URL, {
    path: "/ws/realtime",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    auth: buildSocketAuth(),
  });

  _socket.on("connect", () => {
    _socket!.emit("join", "dashboard");
    // Re-register all listeners after reconnect
    Object.entries(_listeners).forEach(([eventName, handler]) => {
      _socket!.on(eventName, handler);
    });
  });

  return _socket;
}

export function useSocket(eventNames: string[] = []): UseSocketResult {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
  const mountedRef = useRef(true);

  const addEvent = useCallback((eventName: string, data: unknown) => {
    if (!mountedRef.current) return;
    const entry: SocketEvent = {
      eventName,
      data: data as Record<string, unknown>,
      receivedAt: Date.now(),
    };
    setLastEvent(entry);
    setEvents((prev) => [entry, ...prev].slice(0, 100)); // keep max 100
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const socket = getSocket();

    setConnected(socket.connected);

    const onConnect = () => mountedRef.current && setConnected(true);
    const onDisconnect = () => mountedRef.current && setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Register event-specific handlers
    const handlers: Record<string, (data: unknown) => void> = {};
    for (const name of eventNames) {
      handlers[name] = (data: unknown) => addEvent(name, data);
      socket.on(name, handlers[name]);
      _listeners[name] = handlers[name];
    }

    return () => {
      mountedRef.current = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      for (const name of eventNames) {
        socket.off(name, handlers[name]);
        delete _listeners[name];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected, events, lastEvent };
}
