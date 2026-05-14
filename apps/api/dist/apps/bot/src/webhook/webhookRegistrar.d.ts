import { PrismaService } from "../../../../libs/db/src/prisma";
import { GroupConfig } from "./groupGuard";
export interface BotConfig {
    fonnteToken: string;
    webhookSecret?: string;
    groupConfig: GroupConfig;
}
export interface DispatchContext {
    userMessage: string;
    sender: string;
    conversationSender: string;
    resolvedName: string | null;
    userWaIdentity: string;
    imageUrl: string | null;
    isgroup: boolean;
}
export type MessageDispatcher = (ctx: DispatchContext) => Promise<{
    reply: string;
    entryType: string;
    orderId?: number;
    totalPrice?: number;
    cartItems?: any[];
}>;
export type HistoryRecorder = (data: {
    sender: string;
    name?: string | null;
    question: string;
    reply: string;
    type?: string;
    orderId?: number | null;
    totalPrice?: number | null;
    cartItems?: any[] | null;
}) => Promise<void>;
export declare function registerFonnteWebhook(app: any, config: BotConfig, dispatch: MessageDispatcher, recordHistory: HistoryRecorder, prisma: PrismaService): void;
