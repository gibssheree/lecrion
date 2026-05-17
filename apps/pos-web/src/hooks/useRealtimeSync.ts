// apps/pos-web/src/hooks/useRealtimeSync.ts
// Socket.IO events → store updates for POS

import { useEffect } from "react";
import { getSocket } from "../services/realtime";
import { useRegisterStore } from "../store/register.store";

/**
 * Subscribes to realtime events relevant to the POS:
 * - canonical order/payment/cashflow events → refresh register session balance
 * - stock events are handled elsewhere by auto-refresh
 *
 * Call once at the PosPage level.
 */
export function useRealtimeSync() {
  const refreshRegister = useRegisterStore((s) => s.refresh);

  useEffect(() => {
    const socket = getSocket();

    // Refresh register state when a sale/payment changes cash or order status.
    const onActivity = () => {
      refreshRegister();
    };

    socket.on("order.created", onActivity);
    socket.on("order.confirmed", onActivity);
    socket.on("payment.confirmed", onActivity);
    socket.on("cashflow.income.recorded", onActivity);
    socket.on("register.opened", onActivity);
    socket.on("register.closed", onActivity);

    return () => {
      socket.off("order.created", onActivity);
      socket.off("order.confirmed", onActivity);
      socket.off("payment.confirmed", onActivity);
      socket.off("cashflow.income.recorded", onActivity);
      socket.off("register.opened", onActivity);
      socket.off("register.closed", onActivity);
    };
  }, [refreshRegister]);
}
