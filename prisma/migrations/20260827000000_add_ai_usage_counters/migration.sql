-- AI chat quota tracking. See the model comment in schema.prisma for the
-- period-string convention and why only the Owner Assistant endpoint uses
-- this today (Customer Service bot isn't store-scoped yet).

CREATE TABLE "ai_usage_counters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "quota_type" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX "uniq_ai_usage_counter" ON "ai_usage_counters"("store_id", "quota_type", "period");
CREATE INDEX "idx_ai_usage_store_type" ON "ai_usage_counters"("store_id", "quota_type");
