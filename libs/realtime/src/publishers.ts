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
  storeId?: string;
}): void {
  try {
    const payload = JSON.parse(inboxRow.payload ?? "{}");
    const room = inboxRow.storeId ? `store:${inboxRow.storeId}` : undefined;
    emit(
      "sync.inbox",
      { event: inboxRow.event_type, ...payload },
      room,
    );
  } catch {
    /* ignore malformed */
  }
}

export function emitNotification(notification: Record<string, any>): void {
  emit("notification", notification);
}

export function emitKitchenTicketCreated(ticket: {
  id: number;
  storeId: string;
  orderId: number;
  ticketNumber: string;
  tableId?: number | null;
  status: string;
  priority?: string;
  itemCount: number;
}): void {
  emit(
    "kitchen.ticket.created",
    {
      event: "kitchen.ticket.created",
      ticketId: ticket.id,
      orderId: ticket.orderId,
      ticketNumber: ticket.ticketNumber,
      tableId: ticket.tableId ?? null,
      status: ticket.status,
      priority: ticket.priority ?? "normal",
      itemCount: ticket.itemCount,
      storeId: ticket.storeId,
    },
    `store:${ticket.storeId}`,
  );
  // Also emit to dashboard so admin sees activity globally
  emit("kitchen.ticket.created", {
    event: "kitchen.ticket.created",
    ticketId: ticket.id,
    storeId: ticket.storeId,
  });
}

export function emitKitchenTicketUpdated(ticket: {
  id: number;
  storeId: string;
  status: string;
}): void {
  emit(
    "kitchen.ticket.updated",
    {
      event: "kitchen.ticket.updated",
      ticketId: ticket.id,
      status: ticket.status,
      storeId: ticket.storeId,
    },
    `store:${ticket.storeId}`,
  );
  emit("kitchen.ticket.updated", {
    event: "kitchen.ticket.updated",
    ticketId: ticket.id,
    storeId: ticket.storeId,
  });
}
