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
        const resolvedParams = await params;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const classroom = await db_1.db.classroom.findUnique({
            where: { id: resolvedParams.id, teacherId: session.user.id }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await req.json();
        const assignment = await db_1.db.assignment.update({
            where: { id: resolvedParams.assignmentId },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.maxScore !== undefined && { maxScore: body.maxScore }),
                ...(body.passScore !== undefined && { passScore: body.passScore }),
                ...(body.type !== undefined && { type: body.type }),
                ...(body.checklists !== undefined && { checklists: body.checklists }),
                ...(body.visible !== undefined && { visible: body.visible }),
                ...(body.order !== undefined && { order: body.order }),
            }
        });
        return server_1.NextResponse.json(assignment);
    }
    catch (error) {
        console.error("[ASSIGNMENT_PATCH]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function DELETE(req, { params }) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        const resolvedParams = await params;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id: resolvedParams.id,
                teacherId: session.user.id
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const assignment = await db_1.db.assignment.findUnique({
            where: { id: resolvedParams.assignmentId, classId: resolvedParams.id }
        });
        if (!assignment) {
            return new server_1.NextResponse("Assignment Not Found", { status: 404 });
        }
        await db_1.db.assignment.delete({
            where: {
                id: resolvedParams.assignmentId,
            }
        });
        return new server_1.NextResponse(null, { status: 204 });
    }
    catch (error) {
        console.error("[ASSIGNMENT_DELETE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
