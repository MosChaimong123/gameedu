"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function DELETE(req, { params }) {
    const { id, skillId } = await params;
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
        const skill = await db_1.db.skill.delete({
            where: {
                id: skillId,
                classId: id
            }
        });
        return server_1.NextResponse.json(skill);
    }
    catch (error) {
        console.error("[SKILL_DELETE]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
