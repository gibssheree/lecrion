import { PrismaService } from "../../../../libs/db/src/prisma";
export declare function setPrisma(prisma: PrismaService): void;
export declare function isDuplicate(msgId: string): Promise<boolean>;
