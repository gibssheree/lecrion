import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "../services/realtime";

export interface SocketEvent {
  eventName: string;
  data: Record<string, unknown>;
  receivedAt: number;
  /** Stable key used to detect duplicate events (e.g. replayed on reconnect). */
  dedupeKey: string;
}

/**
 * Build a stable dedup key from the most specific identifier in a payload.
 *
 * Priority:
 *  1. `eventId`  — backend-generated UUID/ULID, globally unique (preferred)
 *  2. `<eventName>:<entityId>` — composed from the business entity ID present
 *  3. `<eventName>:<JSON>`     — last-resort for events without any ID field
 */
function makeDedupeKey(eventName: string, data: Record<string, unknown>): string {
  if (data.eventId) return String(data.eventId);

  const entityId =
    data.orderId ??
    data.saleId ??
    data.productId ??
    data.sessionId ??
    data.id;

  if (entityId !== undefined && entityId !== null) {
    return `${eventName}:${String(entityId)}`;
  }

  return `${eventName}:${JSON.stringify(data)}`;
}

export function useSocket(eventNames: string[] = []) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const mountedRef = useRef(true);
  /**
   * Sliding window of recently seen dedup keys.
   * Capped at 100 entries to prevent unbounded memory growth.
   * When the cap is hit the window is cleared — we only need short-term dedup
   * (covering the reconnect window, not the full session).
   */
  const seenKeysRef = useRef(new Set<string>());

  const addEvent = useCallback((eventName: string, data: unknown) => {
    if (!mountedRef.current) return;

    const payload = data as Record<string, unknown>;
    const dedupeKey = makeDedupeKey(eventName, payload);

    // Reset window before it grows unbounded.
    if (seenKeysRef.current.size >= 100) {
      seenKeysRef.current.clear();
    }

    // Drop duplicate — same event replayed on reconnect.
    if (seenKeysRef.current.has(dedupeKey)) return;
    seenKeysRef.current.add(dedupeKey);

    const entry: SocketEvent = {
      eventName,
      data: payload,
      receivedAt: Date.now(),
      dedupeKey,
    };

    setEvents((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const socket = getSocket();
    setConnected(socket.connected);

    const onConnect = () => mountedRef.current && setConnected(true);
    const onDisconnect = () => mountedRef.current && setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const handlers: Record<string, (d: unknown) => void> = {};
    for (const name of eventNames) {
      handlers[name] = (d: unknown) => addEvent(name, d);
      socket.on(name, handlers[name]);
    }

    return () => {
      mountedRef.current = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      for (const name of eventNames) socket.off(name, handlers[name]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected, events };
}
