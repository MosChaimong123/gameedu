"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const server_1 = require("next/server");
async function GET(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!session || !session.user) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        // Await params as per Next.js 15/16 changes if necessary, 
        // though usually params is accessible directly in older versions.
        // In Next.js 15+ params is a Promise.
        const { id } = await params;
        const set = await db_1.db.questionSet.findUnique({
            where: {
                id: id,
                creatorId: session.user.id,
            },
        });
        if (!set) {
            return new server_1.NextResponse("Not Found", { status: 404 });
        }
        return server_1.NextResponse.json(set);
    }
    catch (error) {
        console.error("[SET_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function PATCH(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!session || !session.user) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const { id } = await params;
        const body = await req.json();
        const { title, description, questions, isPublic, coverImage, folderId } = body;
        // Check ownership
        const existingSet = await db_1.db.questionSet.findUnique({
            where: {
                id: id,
                creatorId: session.user.id,
            },
        });
        if (!existingSet) {
            return new server_1.NextResponse("Not Found", { status: 404 });
        }
        const updatedSet = await db_1.db.questionSet.update({
            where: {
                id: id,
            },
            data: {
                title,
                description,
                questions,
                isPublic,
                coverImage,
                folderId,
            },
        });
        return server_1.NextResponse.json(updatedSet);
    }
    catch (error) {
        console.error("[SET_PATCH]", error);
    }
}
async function DELETE(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!session || !session.user) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const { id } = await params;
        // Check ownership
        const existingSet = await db_1.db.questionSet.findUnique({
            where: {
                id: id,
                creatorId: session.user.id,
            },
        });
        if (!existingSet) {
            return new server_1.NextResponse("Not Found", { status: 404 });
        }
        await db_1.db.questionSet.delete({
            where: {
                id: id,
            },
        });
        return new server_1.NextResponse(null, { status: 200 });
    }
    catch (error) {
        console.error("[SET_DELETE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
