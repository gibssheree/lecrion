// libs/db/src/transactions.ts
// Prisma transaction helper

import { PrismaService } from "./prisma";

/**
 * Run a callback inside a Prisma interactive transaction.
 */
export async function withPrismaTransaction<T>(
  prisma: PrismaService,
  callback: (tx: any) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(callback) as Promise<T>;
}
