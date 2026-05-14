"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppValidationPipe = void 0;
const common_1 = require("@nestjs/common");
exports.AppValidationPipe = new common_1.ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
        enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
        const messages = errors.flatMap((err) => {
            if (err.constraints)
                return Object.values(err.constraints);
            if (err.children?.length) {
                return err.children.flatMap((child) => child.constraints ? Object.values(child.constraints) : []);
            }
            return [`${err.property} is invalid`];
        });
        return new common_1.BadRequestException(messages);
    },
});
//# sourceMappingURL=validation.pipe.js.map