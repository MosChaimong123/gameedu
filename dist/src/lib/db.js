"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.db = globalForPrisma.prisma || new client_1.PrismaClient();
// Update: Force refresh if OMR models are missing (for dev development only)
if (process.env.NODE_ENV !== "production") {
    if (globalForPrisma.prisma && !globalForPrisma.prisma.omrQuiz) {
        console.log("REFRESHING_PRISMA_CLIENT...");
        globalForPrisma.prisma = new client_1.PrismaClient();
    }
    else {
        globalForPrisma.prisma = exports.db;
    }
}
