"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const app_logger_service_1 = require("./infrastructure/logging/app-logger.service");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const validation_pipe_1 = require("./common/pipes/validation.pipe");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const tenant_guard_1 = require("./common/guards/tenant.guard");
const auth_service_1 = require("./modules/auth/auth.service");
const app_config_service_1 = require("./infrastructure/config/app-config.service");
const realtime_service_1 = require("./infrastructure/realtime/realtime.service");
async function bootstrap() {
    const logger = new app_logger_service_1.AppLoggerService();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger,
        bufferLogs: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(validation_pipe_1.AppValidationPipe);
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor(logger));
    const reflector = app.get(core_1.Reflector);
    const authService = app.get(auth_service_1.AuthService);
    const configService = app.get(app_config_service_1.AppConfigService);
    app.useGlobalGuards(new jwt_auth_guard_1.JwtAuthGuard(reflector, authService, configService), new roles_guard_1.RolesGuard(reflector), new tenant_guard_1.TenantGuard());
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3001',
        'http://localhost:3002',
    ];
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
    });
    const port = configService.port;
    await app.listen(port);
    const httpServer = app.getHttpServer();
    const realtimeService = app.get(realtime_service_1.RealtimeService);
    realtimeService.init(httpServer);
    logger.log(`[NestJS API] Started on port ${port}`, 'Bootstrap');
    logger.log(`[Socket.IO] Realtime server on ws://localhost:${port}/ws/realtime`, 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map