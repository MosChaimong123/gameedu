"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET() {
    var _a;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const folders = await db_1.db.folder.findMany({
            where: {
                creatorId: session.user.id
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return server_1.NextResponse.json(folders);
    }
    catch (error) {
        console.error("Failed to fetch folders", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
async function POST(req) {
    var _a;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const { name, parentFolderId } = await req.json();
        if (!name) {
            return new server_1.NextResponse("Folder name is required", { status: 400 });
        }
        const folder = await db_1.db.folder.create({
            data: {
                name,
                creatorId: session.user.id,
                parentFolderId: parentFolderId || null
            }
        });
        return server_1.NextResponse.json(folder);
    }
    catch (error) {
        console.error("Failed to create folder", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
