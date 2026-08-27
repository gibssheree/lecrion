-- Multi-tenant WhatsApp bot routing (SEC-11). See the model comment in
-- schema.prisma for why this is a phone->store binding table rather than
-- adding store_id to carts/cart_items/chat_history.

CREATE TABLE "bot_conversation_bindings" (
    "sender" TEXT NOT NULL PRIMARY KEY,
    "store_id" TEXT NOT NULL,
    "bound_at" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX "idx_bot_conversation_bindings_store" ON "bot_conversation_bindings"("store_id");
