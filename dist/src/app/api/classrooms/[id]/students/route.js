"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function POST(req, { params }) {
    const { id } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { students } = body;
        if (!students || !Array.isArray(students)) {
            return new server_1.NextResponse("Invalid data", { status: 400 });
        }
        const classroom = await db_1.db.classroom.findUnique({
            where: { id, teacherId: session.user.id },
            include: { students: true }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const startOrder = classroom.students.length;
        const created = await db_1.db.student.createMany({
            data: students.map((s, i) => ({
                name: s.name,
                nickname: s.nickname || null,
                classId: id,
                avatar: s.avatar || Math.floor(Math.random() * 1000).toString(),
                loginCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                order: startOrder + i,
            }))
        });
        return server_1.NextResponse.json(created);
    }
    catch (error) {
        console.error("[STUDENTS_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function PATCH(req, { params }) {
    var _a;
    const session = await (0, auth_1.auth)();
    const { id } = await params;
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    try {
        const classroom = await db_1.db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom)
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const items = await req.json();
        await Promise.all(items.map((item) => db_1.db.student.update({ where: { id: item.id }, data: { order: item.order } })));
        return new server_1.NextResponse(null, { status: 204 });
    }
    catch (error) {
        console.error("[STUDENTS_REORDER]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
