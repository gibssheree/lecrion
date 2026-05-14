"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const app_logger_service_1 = require("../../infrastructure/logging/app-logger.service");
const metrics_1 = require("../../../../../libs/common/src/telemetry/metrics");
let _reqCounter = 0;
let LoggingInterceptor = class LoggingInterceptor {
    constructor(appLogger) {
        this.appLogger = appLogger;
        this.logger = new common_1.Logger('HTTP');
        this.SKIP_PATHS = new Set([
            '/api/health',
            '/api/metrics',
            '/health',
            '/metrics',
        ]);
    }
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        if (this.SKIP_PATHS.has(req.path))
            return next.handle();
        const correlationId = req.headers['x-correlation-id'] ||
            `req-${Date.now()}-${(++_reqCounter).toString(36)}`;
        req.correlationId = correlationId;
        res.setHeader('X-Correlation-Id', correlationId);
        this.appLogger?.setCorrelationId(correlationId);
        const start = Date.now();
        const { method, url } = req;
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const ms = Date.now() - start;
                const status = res.statusCode;
                metrics_1.metrics.httpRequestDuration.observe(ms);
                const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';
                this.logger[level](`${method} ${url} ${status} +${ms}ms [${correlationId}]`);
                this.appLogger?.setCorrelationId(null);
            },
            error: (err) => {
                const ms = Date.now() - start;
                this.logger.error(`${method} ${url} ERR +${ms}ms [${correlationId}]: ${err.message}`);
                this.appLogger?.setCorrelationId(null);
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [app_logger_service_1.AppLoggerService])
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map