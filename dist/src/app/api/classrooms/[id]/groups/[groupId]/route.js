"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function DELETE(req, { params }) {
    const { id, groupId } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const group = await db_1.db.studentGroup.findUnique({
            where: {
                id: groupId,
                classId: id
            }
        });
        if (!group) {
            return new server_1.NextResponse("Group not found", { status: 404 });
        }
        await db_1.db.studentGroup.delete({
            where: { id: groupId }
        });
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("[GROUP_DELETE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
async function PATCH(req, { params }) {
    const { id, groupId } = await params;
    const session = await (0, auth_1.auth)();
    if (!session || !session.user) {
        return new server_1.NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const body = await req.json();
        const { name, studentIds } = body;
        const classroom = await db_1.db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });
        if (!classroom) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const group = await db_1.db.studentGroup.findUnique({
            where: {
                id: groupId,
                classId: id
            }
        });
        if (!group) {
            return new server_1.NextResponse("Group not found", { status: 404 });
        }
        const updatedData = {};
        if (name !== undefined)
            updatedData.name = name;
        if (studentIds !== undefined)
            updatedData.studentIds = studentIds;
        const updatedGroup = await db_1.db.studentGroup.update({
            where: { id: groupId },
            data: updatedData
        });
        return server_1.NextResponse.json(updatedGroup);
    }
    catch (error) {
        console.error("[GROUP_PATCH]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
