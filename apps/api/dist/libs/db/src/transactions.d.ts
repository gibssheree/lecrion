import { PrismaService } from "./prisma";
export declare function withPrismaTransaction<T>(prisma: PrismaService, callback: (tx: any) => Promise<T>): Promise<T>;
