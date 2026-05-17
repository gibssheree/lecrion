-- Phase 9: RBAC Hardening — add role and store_id to users table
-- Migration: 20260515080000_phase9_rbac_users_role_store

-- Add role column with default 'cashier' for new accounts.
-- Backfill existing rows to 'owner' (they were implicitly owner before).
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'cashier';
UPDATE "users" SET "role" = 'owner' WHERE "role" = 'cashier';

-- Add store_id column for store affiliation.
ALTER TABLE "users" ADD COLUMN "store_id" TEXT NOT NULL DEFAULT 'default-store';

-- Indexes for role-based and store-scoped queries.
CREATE INDEX "idx_users_role" ON "users"("role");
CREATE INDEX "idx_users_store" ON "users"("store_id");
