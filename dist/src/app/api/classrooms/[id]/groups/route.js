"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const groups = await db_1.db.studentGroup.findMany({
            where: {
                classId: id,
                classroom: {
                    teacherId: session.user.id
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return server_1.NextResponse.json(groups);
    }
    catch (error) {
        console.error("[GROUPS_GET]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function POST(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { name, groups } = body;
        if (!name || !groups || !Array.isArray(groups)) {
            return new server_1.NextResponse("Missing data", { status: 400 });
        }
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        // Store the entire set of groups as a single record
        // By stringifying the objects, we avoid a Prisma schema change. 
        const groupRecord = await db_1.db.studentGroup.create({
            data: {
                name: name,
                classId: id,
                studentIds: groups.map((g) => JSON.stringify({ name: g.name, studentIds: g.studentIds }))
            }
        });
        return server_1.NextResponse.json([groupRecord]);
    }
    catch (error) {
        console.error("[GROUPS_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
