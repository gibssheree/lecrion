import { Injectable, Logger } from '@nestjs/common';
import * as socketLib from '../../../../../libs/realtime/src/socket';
import * as publishers from '../../../../../libs/realtime/src/publishers';

/**
 * RealtimeService — NestJS wrapper around the Socket.IO singleton.
 *
 * Per 01-blueprint.md § Sync Model:
 *   "Socket.IO pushes update to dashboard and bot clients."
 *
 * The Socket.IO server is initialized in main.ts after the HTTP server starts.
 * This service delegates all emit calls to libs/realtime/src/publishers.ts
 * which use the singleton io instance from libs/realtime/src/socket.ts.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  /**
   * Initialize the Socket.IO server on the NestJS HTTP server.
   * Called once from main.ts after app.listen().
   */
  init(httpServer: any): void {
    socketLib.init(httpServer);
    this.logger.log('Socket.IO server initialized on /ws/realtime');
  }

  /**
   * Generic emit to a room.
   */
  emit(
    eventName: string,
    payload: Record<string, any>,
    room = 'dashboard',
  ): void {
    socketLib.emit(eventName, payload, room);
  }

  /**
   * Emit order.created event to dashboard.
   */
  emitOrderCreated(order: {
    orderId?: number;
    id?: number;
    name?: string;
    type?: string;
    total?: number;
    status?: string;
  }): void {
    publishers.emitOrderCreated(order);
  }

  /**
   * Emit order.status_changed event to dashboard.
   */
  emitOrderStatusChanged(
    orderId: number,
    oldStatus: string,
    newStatus: string,
  ): void {
    publishers.emitOrderStatusChanged(orderId, oldStatus, newStatus);
  }

  /**
   * Emit stock.alert event to dashboard.
   */
  emitStockAlert(product: { id: number; name: string; stock: number }): void {
    publishers.emitStockAlert(product);
  }

  /**
   * Emit stock.low_stock_batch event to dashboard.
   */
  emitLowStockBatch(
    products: Array<{ id: number; name: string; stock: number }>,
  ): void {
    publishers.emitLowStockBatch(products);
  }

  /**
   * Emit a sync inbox event (from outbox processor).
   */
  emitInboxEvent(inboxRow: { event_type: string; payload: string }): void {
    publishers.emitInboxEvent(inboxRow);
  }

  /**
   * Emit a notification to dashboard.
   */
  emitNotification(notification: Record<string, any>): void {
    publishers.emitNotification(notification);
  }
}
