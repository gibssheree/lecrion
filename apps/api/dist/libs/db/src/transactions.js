"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPrismaTransaction = withPrismaTransaction;
async function withPrismaTransaction(prisma, callback) {
    return prisma.$transaction(callback);
}
//# sourceMappingURL=transactions.js.map