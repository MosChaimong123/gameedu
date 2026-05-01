import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guards";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";

export type BattleReadAuthResult =
    | { ok: true; scope: "student"; studentId: string }
    | { ok: true; scope: "teacher"; teacherId: string }
    | { ok: false; status: 400 | 401 | 403; error: "INVALID_REQUEST" | "AUTH_REQUIRED" | "FORBIDDEN" };

export async function authorizeBattleRead(params: {
    classId: string;
    studentId?: string | null;
    studentCode?: string | null;
}): Promise<BattleReadAuthResult> {
    const studentId = params.studentId?.trim() || null;
    const studentCode = params.studentCode?.trim() || null;

    if (studentCode) {
        if (!studentId) {
            return { ok: false, status: 400, error: "INVALID_REQUEST" };
        }

        const student = await db.student.findFirst({
            where: {
                id: studentId,
                classId: params.classId,
                OR: getStudentLoginCodeVariants(studentCode).map((candidate) => ({
                    loginCode: candidate,
                })),
            },
            select: { id: true },
        });

        if (!student) {
            return { ok: false, status: 403, error: "FORBIDDEN" };
        }

        return { ok: true, scope: "student", studentId: student.id };
    }

    const user = await requireSessionUser();
    if (!user?.id) {
        return { ok: false, status: 401, error: "AUTH_REQUIRED" };
    }

    const classroom = await db.classroom.findFirst({
        where: { id: params.classId, teacherId: user.id },
        select: { id: true },
    });

    if (!classroom) {
        return { ok: false, status: 403, error: "FORBIDDEN" };
    }

    return { ok: true, scope: "teacher", teacherId: user.id };
}
