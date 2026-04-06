import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import {
    getTeacherAssignmentOverview,
    parseAssignmentOverviewRangeDays,
} from "@/lib/services/teacher/get-teacher-assignment-overview";

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const { searchParams } = new URL(req.url);
    const rangeDays = parseAssignmentOverviewRangeDays(searchParams.get("range"));
    const rawClassId = searchParams.get("classId");
    const classId =
        rawClassId && OBJECT_ID_RE.test(rawClassId.trim()) ? rawClassId.trim() : undefined;

    try {
        const overview = await getTeacherAssignmentOverview(session.user.id, { classId, rangeDays });
        if (overview === null) {
            return createAppErrorResponse("NOT_FOUND", "Classroom not found", 404);
        }
        return NextResponse.json(overview);
    } catch (error) {
        console.error("[TEACHER_ASSIGNMENTS_OVERVIEW_GET]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
