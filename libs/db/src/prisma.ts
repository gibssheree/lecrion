import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as path from "path";

/**
 * PrismaService — Prisma 7.x with better-sqlite3 adapter.
 *
 * Prisma 7 removed datasource URL from schema.prisma.
 * The adapter must be passed at construction time.
 *
 * DB path resolution order:
 *   1. DATABASE_URL env var (e.g. "file:/absolute/path/canteen.db" or absolute path)
 *   2. Default: monorepo root /database/canteen.db
 */
function resolveDbUrl(): string {
  const envUrl = process.env["DATABASE_URL"];
  if (envUrl) {
    // PrismaBetterSqlite3 accepts ":memory:" or a file path string
    return envUrl.startsWith("file:") ? envUrl.slice(5) : envUrl;
  }
  // __dirname is libs/db/src — go up 3 levels to monorepo root
  return path.resolve(__dirname, "../../../database/canteen.db");
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const dbUrl = resolveDbUrl();
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
