"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.getOptionalDbModel = getOptionalDbModel;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.db = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : new client_1.PrismaClient();
function getOptionalDbModel(name) {
    const model = exports.db[name];
    return model ? model : null;
}
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.db;
}
