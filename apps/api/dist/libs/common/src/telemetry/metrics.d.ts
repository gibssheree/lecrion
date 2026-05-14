export declare function counter(name: string, help?: string): {
    inc(labels?: Record<string, string>, amount?: number): void;
    reset(): void;
};
export declare function gauge(name: string, help?: string): {
    set(value: number): void;
    inc(amount?: number): void;
    dec(amount?: number): void;
    get(): number;
};
export declare function histogram(name: string, help?: string, bucketBounds?: number[]): {
    observe(value: number): void;
    measure<T>(fn: () => Promise<T>): Promise<T>;
};
export declare const metrics: {
    webhookReceived: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    webhookDeduped: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    webhookErrors: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    ordersCreated: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    ordersFailed: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    checkoutLatency: {
        observe(value: number): void;
        measure<T>(fn: () => Promise<T>): Promise<T>;
    };
    llmRequests: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    llmErrors: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    llmLatency: {
        observe(value: number): void;
        measure<T>(fn: () => Promise<T>): Promise<T>;
    };
    llmBlockedReplies: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    wsConnections: {
        set(value: number): void;
        inc(amount?: number): void;
        dec(amount?: number): void;
        get(): number;
    };
    outboxPending: {
        set(value: number): void;
        inc(amount?: number): void;
        dec(amount?: number): void;
        get(): number;
    };
    outboxProcessed: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
    httpRequestDuration: {
        observe(value: number): void;
        measure<T>(fn: () => Promise<T>): Promise<T>;
    };
    dbQueryLatency: {
        observe(value: number): void;
        measure<T>(fn: () => Promise<T>): Promise<T>;
    };
    dbErrors: {
        inc(labels?: Record<string, string>, amount?: number): void;
        reset(): void;
    };
};
export declare function renderMetrics(): string;
