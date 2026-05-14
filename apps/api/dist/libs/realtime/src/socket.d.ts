import { Server } from "socket.io";
export declare function init(httpServer: any): Server;
export declare function io(): Server | null;
export declare function emit(eventName: string, payload: Record<string, any>, room?: string): void;
