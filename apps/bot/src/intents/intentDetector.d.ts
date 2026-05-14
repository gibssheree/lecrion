export interface Intent {
    type: string;
    [key: string]: any;
}
declare function sanitizeMessageForIntent(rawMessage?: string): string;
export declare function detectIntent(userMessage: string): Intent;
export { sanitizeMessageForIntent };
