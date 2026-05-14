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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
        this.DEFAULT_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    }
    extractDigits(value) {
        return String(value || '').replace(/\D/g, '');
    }
    normalizePhoneFromWa(value) {
        return this.extractDigits(value);
    }
    buildWaEmail(phoneDigits) {
        return `${phoneDigits || 'guest'}@wa.local`;
    }
    async ensureUserByPhone(waPhone, tx) {
        const prisma = tx || this.prisma;
        const phoneDigits = this.normalizePhoneFromWa(waPhone);
        const email = this.buildWaEmail(phoneDigits);
        let user = await prisma.users.findUnique({
            where: { email },
        });
        if (user) {
            return {
                userId: user.id,
                phoneDigits,
                email,
                created: false,
            };
        }
        user = await prisma.users.create({
            data: {
                email,
                password_hash: this.DEFAULT_PASSWORD_HASH,
            },
        });
        return {
            userId: user.id,
            phoneDigits,
            email,
            created: true,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map