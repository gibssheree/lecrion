export interface GroupConfig {
    groupReplyOnlyWhenTagged: boolean;
    groupAllowPrefixCommand: boolean;
    groupAllowReplyFollowUp: boolean;
    groupCommandPrefix: string;
    groupTagAliases: string[];
    groupTagKeywords: string[];
}
export declare function extractDigits(value: string): string;
export declare function isPrefixTriggeredGroupMessage(isGroup: boolean, userMessage: string, cfg: GroupConfig): boolean;
export declare function shouldProcessGroupMessage(body: Record<string, any>, userMessage: string, cfg: GroupConfig): boolean;
export declare function getUserWaIdentity(body: Record<string, any>): string;
