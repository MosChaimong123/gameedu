"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.DELETE = DELETE;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user || !session.user.id) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id // Ensure ownership
            },
            include: {
                students: {
                    orderBy: { name: 'asc' },
                    include: {
                        submissions: true
                    }
                },
                skills: true,
                assignments: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Not Found", { status: 404 });
        }
        return server_1.NextResponse.json(classroom);
    }
    catch (error) {
        console.error("[CLASSROOM_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function DELETE(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user || !session.user.id) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const classroom = await db_1.db.classroom.delete({
            where: {
                id,
                teacherId: session.user.id
            }
        });
        return server_1.NextResponse.json(classroom);
    }
    catch (error) {
        console.error("[CLASSROOM_DELETE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function PATCH(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user || !session.user.id) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const classroom = await db_1.db.classroom.update({
            where: {
                id,
                teacherId: session.user.id
            },
            data: {
                ...body
            }
        });
        return server_1.NextResponse.json(classroom);
    }
    catch (error) {
        console.error("[CLASSROOM_PATCH]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
