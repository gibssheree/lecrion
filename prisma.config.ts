import { defineConfig } from "@prisma/config";

/**
 * Prisma configuration — storage strategy decision.
 *
 * ── Current state (dev / single-node) ────────────────────────────────────────
 * Provider: SQLite via better-sqlite3 adapter
 * DB file:  database/canteen.db  (relative to monorepo root)
 *
 * SQLite is appropriate for:
 *   - Local development
 *   - Single-node deployments (one server, one process)
 *   - Canteen / small-store scenarios with low concurrent write volume
 *
 * ── Production target (multi-node / scale) ───────────────────────────────────
 * Provider: PostgreSQL (preferred) or MySQL
 * Reason:   concurrent writes, row-level locking, proper multi-tenant isolation,
 *           BullMQ/Redis queue support, connection pooling (PgBouncer)
 *
 * Migration path:
 *   1. Change datasource provider in schema.prisma to "postgresql"
 *   2. Set DATABASE_URL to a PostgreSQL connection string
 *   3. Run: prisma migrate dev
 *   4. Remove @prisma/adapter-better-sqlite3 dependency
 *   5. Remove better-sqlite3 dependency
 *   6. Update PrismaService constructor (no adapter needed for PostgreSQL)
 *
 * ── Environment variable ─────────────────────────────────────────────────────
 * DATABASE_URL controls the DB path/connection string at runtime.
 * For SQLite:    file:/absolute/path/to/canteen.db
 * For PostgreSQL: postgresql://user:pass@host:5432/dbname
 *
 * The DATABASE_URL in apps/api/.env takes precedence over this config file
 * for runtime connections. This file is used by Prisma CLI commands only.
 */

const dbUrl = process.env["DATABASE_URL"] ?? "file:./database/canteen.db";

export default defineConfig({
  earlyAccess: true,
  studio: {
    port: 5555,
  },
  datasource: {
    url: dbUrl,
  },
  migrate: {
    connection: {
      url: dbUrl,
    },
  },
});
