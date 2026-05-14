"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLoggerService = void 0;
const common_1 = require("@nestjs/common");
let AppLoggerService = class AppLoggerService {
    constructor() {
        this.isDev = process.env['NODE_ENV'] !== 'production';
        this._correlationId = null;
    }
    setCorrelationId(id) {
        this._correlationId = id;
    }
    log(message, context) {
        this.write('info', message, context);
    }
    error(message, trace, context) {
        this.write('error', message, context, trace);
    }
    warn(message, context) {
        this.write('warn', message, context);
    }
    debug(message, context) {
        if (this.isDev)
            this.write('debug', message, context);
    }
    verbose(message, context) {
        if (this.isDev)
            this.write('verbose', message, context);
    }
    write(level, message, context, trace) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service: 'api',
            context: context ?? 'App',
            message,
        };
        if (this._correlationId) {
            entry['correlationId'] = this._correlationId;
        }
        if (trace) {
            entry['trace'] = trace.slice(0, 1000);
        }
        if (this.isDev) {
            const color = this.levelColor(level);
            const ctx = context ? `[${context}]` : '';
            const corr = this._correlationId ? ` (${this._correlationId})` : '';
            const out = `${color}[${level.toUpperCase()}]${ctx}${corr} ${message}\x1b[0m`;
            if (level === 'error')
                process.stderr.write(out + '\n');
            else
                process.stdout.write(out + '\n');
            if (trace)
                process.stderr.write(trace + '\n');
        }
        else {
            const line = JSON.stringify(entry) + '\n';
            if (level === 'error')
                process.stderr.write(line);
            else
                process.stdout.write(line);
        }
    }
    levelColor(level) {
        switch (level) {
            case 'error':
                return '\x1b[31m';
            case 'warn':
                return '\x1b[33m';
            case 'debug':
                return '\x1b[36m';
            case 'verbose':
                return '\x1b[35m';
            default:
                return '\x1b[32m';
        }
    }
    setLogLevels(_levels) { }
};
exports.AppLoggerService = AppLoggerService;
exports.AppLoggerService = AppLoggerService = __decorate([
    (0, common_1.Injectable)()
], AppLoggerService);
//# sourceMappingURL=app-logger.service.js.map