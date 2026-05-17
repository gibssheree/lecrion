// apps/api/src/modules/fnb/fnb.types.ts
// Canonical type strings for F&B vertical module.

export const DiningTableStatus = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  CLEANING: 'cleaning',
} as const;
export type DiningTableStatusValue =
  (typeof DiningTableStatus)[keyof typeof DiningTableStatus];
export const DINING_TABLE_STATUS_VALUES = Object.values(
  DiningTableStatus,
) as DiningTableStatusValue[];

export const KitchenTicketStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  CANCELLED: 'cancelled',
} as const;
export type KitchenTicketStatusValue =
  (typeof KitchenTicketStatus)[keyof typeof KitchenTicketStatus];
export const KITCHEN_TICKET_STATUS_VALUES = Object.values(
  KitchenTicketStatus,
) as KitchenTicketStatusValue[];

export const KitchenTicketPriority = {
  NORMAL: 'normal',
  RUSH: 'rush',
  VIP: 'vip',
} as const;
export type KitchenTicketPriorityValue =
  (typeof KitchenTicketPriority)[keyof typeof KitchenTicketPriority];

export const KitchenItemStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  CANCELLED: 'cancelled',
} as const;
export type KitchenItemStatusValue =
  (typeof KitchenItemStatus)[keyof typeof KitchenItemStatus];
