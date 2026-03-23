"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET() {
    var _a;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return server_1.NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    try {
        const sets = await db_1.db.questionSet.findMany({
            where: {
                creatorId: session.user.id
            },
            select: {
                id: true,
                title: true,
                questions: true,
                updatedAt: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        return server_1.NextResponse.json(sets);
    }
    catch (error) {
        return server_1.NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
