// libs/realtime/src/channels.ts
// Socket.IO channel naming contracts — all apps must use these names

export const channels = {
  ORDER_CREATED: (storeId: string) => `store:${storeId}:order:created`,
  ORDER_UPDATED: (storeId: string) => `store:${storeId}:order:updated`,
  ORDER_CANCELLED: (storeId: string) => `store:${storeId}:order:cancelled`,
  STOCK_UPDATED: (storeId: string) => `store:${storeId}:stock:updated`,
  STOCK_LOW_ALERT: (storeId: string) => `store:${storeId}:stock:low`,
  CHAT_MESSAGE: (storeId: string) => `store:${storeId}:chat:message`,
  CHAT_REPLY: (storeId: string) => `store:${storeId}:chat:reply`,
  REGISTER_OPENED: (storeId: string) => `store:${storeId}:register:opened`,
  REGISTER_CLOSED: (storeId: string) => `store:${storeId}:register:closed`,
  NOTIFICATION: (storeId: string) => `store:${storeId}:notification`,
} as const;
