import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "../services/realtime";

export interface SocketEvent {
  eventName: string;
  data: Record<string, unknown>;
  receivedAt: number;
}

export function useSocket(eventNames: string[] = []) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const mountedRef = useRef(true);

  const addEvent = useCallback((eventName: string, data: unknown) => {
    if (!mountedRef.current) return;
    const entry: SocketEvent = {
      eventName,
      data: data as Record<string, unknown>,
      receivedAt: Date.now(),
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
