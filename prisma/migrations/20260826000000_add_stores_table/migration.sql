-- Add a real `stores` table.
--
-- Every store_id column elsewhere in this schema has always been a loose
-- string with no row to anchor to (see the removed comment on
-- stores.service.ts#getStoreInfo: "There is no `stores` table in the
-- current schema... synthetic object... until a stores table is added").
-- This adds that row, carrying the one new field this exists for: `tier`,
-- the subscription plan gating feature access.
--
-- This does NOT add a foreign key from every other store_id column — that's
-- a much larger, separate migration. This table is additive: existing code
-- keeps reading store_settings / store_business_profiles exactly as before.

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'starter',
    "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CreateIndex
CREATE INDEX "idx_stores_tier" ON "stores"("tier");

-- Backfill one row per store that already has a business profile — the
-- closest thing to a store registry that exists today, and every real
-- store (seeded or self-registered) has one. Name comes from
-- store_settings's storeName if present, else falls back to the store_id.
--
-- Every backfilled store defaults to 'starter': this migration must not
-- silently grant paid-tier features to existing stores. Whoever is actually
-- on Business/Enterprise needs their tier set manually afterward.
INSERT INTO "stores" ("id", "name", "tier", "created_at", "updated_at")
SELECT
  sbp.store_id,
  COALESCE(
    (SELECT ss.value FROM store_settings ss WHERE ss.key = sbp.store_id || ':storeName'),
    sbp.store_id
  ),
  'starter',
  sbp.created_at,
  sbp.updated_at
FROM store_business_profiles sbp
WHERE NOT EXISTS (SELECT 1 FROM "stores" s WHERE s.id = sbp.store_id);
