// apps/api/src/modules/aggregator/aggregator.types.ts
//
// Shared DTOs and type definitions for the Order Aggregator module.
// Each third-party platform sends differently structured payloads;
// this file defines the canonical normalized form Lecrion uses internally.

export type AggregatorChannel =
  | 'gofood'
  | 'grabfood'
  | 'shopeefood';

// ── Normalized aggregator order (internal representation) ───────────────────

export interface AggregatorOrderItem {
  /** Platform-side item ID or SKU */
  externalId: string;
  /** Product name as listed on the aggregator */
  name: string;
  /** Quantity ordered */
  qty: number;
  /** Unit price in IDR */
  unitPrice: number;
  /** Notes / special requests from the customer */
  notes?: string;
}

export interface NormalizedAggregatorOrder {
  /** Unique order ID from the platform (used for deduplication) */
  externalOrderId: string;
  /** The aggregator channel that generated this order */
  channel: AggregatorChannel;
  /** Customer name */
  customerName: string;
  /** Customer phone (digits only, may be masked by platform) */
  customerPhone?: string;
  /** Ordered items */
  items: AggregatorOrderItem[];
  /** Delivery address as provided by the platform */
  deliveryAddress?: string;
  /** Total amount (subtotal + delivery - discount) as reported by platform */
  platformTotal: number;
  /** Estimated preparation time in minutes */
  estimatedPrepMinutes?: number;
  /** Raw webhook payload (stringified) for audit / replay */
  rawPayload: string;
}

// ── GoFood webhook shape (simplified — actual payload has more fields) ───────
export interface GoFoodWebhookPayload {
  order_id: string;
  driver_name?: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address?: string;
  order_items: Array<{
    item_id: string;
    item_name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  total_price: number;
  estimated_time?: number;
}

// ── GrabFood webhook shape ───────────────────────────────────────────────────
export interface GrabFoodWebhookPayload {
  orderID: string;
  buyer: {
    name: string;
    phone?: string;
  };
  deliveryInfo?: {
    address?: string;
  };
  cartItems: Array<{
    itemID: string;
    name: string;
    quantity: number;
    price: {
      amount: number;
    };
    specialRequests?: string;
  }>;
  payment: {
    amount: number;
  };
  prepDuration?: number;
}

// ── ShopeeFood webhook shape ─────────────────────────────────────────────────
export interface ShopeeFoodWebhookPayload {
  order_sn: string;
  buyer_username: string;
  buyer_phone?: string;
  shipping_address?: { full_address?: string };
  item_list: Array<{
    item_id: string;
    item_name: string;
    amount: number;
    item_price: number;
    order_item_notes?: string;
  }>;
  total_amount: number;
  estimated_process_time?: number;
}
