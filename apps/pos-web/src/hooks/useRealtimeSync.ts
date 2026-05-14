// apps/pos-web/src/hooks/useRealtimeSync.ts
// Socket.IO events → store updates for POS

import { useEffect } from "react";
import { getSocket } from "../services/realtime";
import { useRegisterStore } from "../store/register.store";

/**
 * Subscribes to realtime events relevant to the POS:
 * - order.created → refresh register session balance
 * - stock.alert → trigger product reload (handled by useProducts auto-refresh)
 *
 * Call once at the PosPage level.
 */
export function useRealtimeSync() {
  const refreshRegister = useRegisterStore((s) => s.refresh);

  useEffect(() => {
    const socket = getSocket();

    // When a new order is created (by bot or another terminal), refresh register
    const onOrderCreated = () => {
      refreshRegister();
    };

    socket.on("order.created", onOrderCreated);
    socket.on("order.status_changed", onOrderCreated);

    return () => {
      socket.off("order.created", onOrderCreated);
      socket.off("order.status_changed", onOrderCreated);
    };
  }, [refreshRegister]);
}
