// libs/realtime/src/subscribers.ts
// Socket.IO event subscriber helpers

import { io } from "./socket";

type EventHandler = (payload: Record<string, any>) => void;

/**
 * Broadcast to all clients in a room.
 */
export function broadcastToRoom(
  room: string,
  eventName: string,
  payload: Record<string, any>,
): void {
  const server = io();
  if (!server) return;
  server.to(room).emit(eventName, { ...payload, _ts: Date.now() });
}
