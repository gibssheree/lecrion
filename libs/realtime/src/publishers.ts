// libs/realtime/src/publishers.ts
// Typed event publishers — enforce correct payload shapes

import { emit } from "./socket";

export function emitOrderCreated(order: {
  orderId?: number;
  id?: number;
  name?: string;
  type?: string;
  total?: number;
  status?: string;
}): void {
  emit("order.created", {
    event: "order.created",
    orderId: order.orderId ?? order.id,
    name: order.name,
    type: order.type,
    total: order.total,
    status: order.status ?? "Not Ready",
  });
}

export function emitOrderStatusChanged(
  orderId: number,
  oldStatus: string,
  newStatus: string,
): void {
  emit("order.status_changed", {
    event: "order.status_changed",
    orderId,
    oldStatus,
    newStatus,
  });
}

export function emitStockAlert(product: {
  id: number;
  name: string;
  stock: number;
}): void {
  emit("stock.alert", {
    event: "stock.alert",
    productId: product.id,
    name: product.name,
    stock: product.stock,
  });
}

export function emitLowStockBatch(
  products: Array<{ id: number; name: string; stock: number }>,
): void {
  emit("stock.low_stock_batch", {
    event: "stock.low_stock_batch",
    count: products.length,
    products,
  });
}

export function emitInboxEvent(inboxRow: {
  event_type: string;
  payload: string;
}): void {
  try {
    const payload = JSON.parse(inboxRow.payload ?? "{}");
    emit("sync.inbox", { event: inboxRow.event_type, ...payload });
  } catch {
    /* ignore malformed */
  }
}

export function emitNotification(notification: Record<string, any>): void {
  emit("notification", notification);
}
