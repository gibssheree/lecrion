import { Request, Response } from 'express';
import { BotDispatchService } from './bot-dispatch.service';
import { HistoryService } from '../chatbot/history.service';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { PrismaService } from '@libs/db/src/prisma';
export declare class BotController {
    private readonly dispatch;
    private readonly historyService;
    private readonly config;
    private readonly prisma;
    private readonly logger;
    constructor(dispatch: BotDispatchService, historyService: HistoryService, config: AppConfigService, prisma: PrismaService);
    handleWebhook(req: Request, res: Response): Promise<void>;
    private processAsync;
}
