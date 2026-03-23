"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const server_1 = require("next/server");
async function GET() {
    try {
        const session = await (0, auth_1.auth)();
        if (!session || !session.user) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        // Fetch sets created by the current user
        const sets = await db_1.db.questionSet.findMany({
            where: {
                creatorId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return server_1.NextResponse.json(sets);
    }
    catch (error) {
        console.error("[SETS_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function POST(req) {
    try {
        const session = await (0, auth_1.auth)();
        if (!session || !session.user) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await req.json();
        const { title, description, isPublic, coverImage } = body;
        if (!title) {
            return new server_1.NextResponse("Title is required", { status: 400 });
        }
        const set = await db_1.db.questionSet.create({
            data: {
                title,
                description,
                isPublic: isPublic || false,
                coverImage,
                creatorId: session.user.id,
                questions: [], // Start empty
            },
        });
        return server_1.NextResponse.json(set);
    }
    catch (error) {
        console.error("[SETS_POST]", error);
        return new server_1.NextResponse(error.message || "Internal Error", { status: 500 });
    }
}
