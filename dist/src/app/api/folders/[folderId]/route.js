"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function PATCH(req, { params }) {
    var _a;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const { folderId } = await params;
        const { name } = await req.json();
        const folder = await db_1.db.folder.update({
            where: {
                id: folderId,
                creatorId: session.user.id
            },
            data: {
                name
            }
        });
        return server_1.NextResponse.json(folder);
    }
    catch (error) {
        console.error("Failed to update folder", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
async function DELETE(req, { params }) {
    var _a;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const { folderId } = await params;
        // First, dissociate all question sets from this folder
        await db_1.db.questionSet.updateMany({
            where: {
                folderId: folderId,
                creatorId: session.user.id
            },
            data: {
                folderId: null
            }
        });
        // Then delete the folder
        await db_1.db.folder.delete({
            where: {
                id: folderId,
                creatorId: session.user.id
            }
        });
        return new server_1.NextResponse("Folder deleted successfully", { status: 200 });
    }
    catch (error) {
        console.error("Failed to delete folder", error);
        return new server_1.NextResponse("Internal Server Error", { status: 500 });
    }
}
