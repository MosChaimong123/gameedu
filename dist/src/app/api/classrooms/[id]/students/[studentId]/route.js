"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
async function PATCH(req, { params }) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        const { id, studentId } = await params;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const classroom = await db_1.db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom)
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const body = await req.json();
        const student = await db_1.db.student.update({
            where: { id: studentId },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.nickname !== undefined && { nickname: body.nickname }),
                ...(body.avatar !== undefined && { avatar: body.avatar }),
                ...(body.order !== undefined && { order: body.order }),
            }
        });
        return server_1.NextResponse.json(student);
    }
    catch (error) {
        console.error("[STUDENT_PATCH]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function DELETE(req, { params }) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        const { id, studentId } = await params;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        const classroom = await db_1.db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom)
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        await db_1.db.student.delete({ where: { id: studentId } });
        return new server_1.NextResponse(null, { status: 204 });
    }
    catch (error) {
        console.error("[STUDENT_DELETE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
