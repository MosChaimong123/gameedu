"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinClassroom = joinClassroom;
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const cache_1 = require("next/cache");
async function joinClassroom(loginCode) {
    var _a;
    const session = await (0, auth_1.auth)();
    const userId = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return { error: "Authentication required" };
    }
    const upperCode = loginCode.trim().toUpperCase();
    try {
        // 1. Find the student record with this code
        const student = await db_1.db.student.findUnique({
            where: { loginCode: upperCode },
            include: { classroom: true }
        });
        if (!student) {
            return { error: "Invalid login code" };
        }
        // 2. Check if it's already linked to THIS user
        if (student.userId === userId) {
            return { error: "You are already in this classroom" };
        }
        // 3. Link the student record to the current user
        await db_1.db.student.update({
            where: { id: student.id },
            data: { userId }
        });
        (0, cache_1.revalidatePath)("/student/home");
        return { success: true, className: student.classroom.name };
    }
    catch (error) {
        console.error("[JOIN_CLASSROOM_ERROR]", error);
        return { error: "Failed to join classroom" };
    }
}
