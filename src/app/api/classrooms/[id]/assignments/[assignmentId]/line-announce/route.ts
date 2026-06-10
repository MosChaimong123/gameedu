import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { pushLineFlex } from "@/lib/line-bot/client";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import {
    buildAssignmentAnnounceFlexBubble,
    buildResultAnnounceFlexBubble,
} from "@/lib/line-bot/reminder-flex";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type AnnounceKind = "assignment" | "result";

/** Student portal landing — students enter their own access code there. */
function getStudentPortalUrl(): string | undefined {
    const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.LINE_BOT_CHAT_URL?.trim();
    if (!base) return undefined;
    return `${base.replace(/\/$/, "")}/student`;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const session = await auth();
    const { id, assignmentId } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const body = (await req.json().catch(() => null)) as { kind?: AnnounceKind } | null;
    const kind: AnnounceKind = body?.kind === "result" ? "result" : "assignment";

    try {
        const assignment = await db.assignment.findUnique({
            where: { id: assignmentId, classId: id },
            select: {
                id: true,
                name: true,
                deadline: true,
                classroom: {
                    select: {
                        id: true,
                        name: true,
                        teacherId: true,
                        teacher: {
                            select: { role: true, plan: true, planStatus: true, planExpiry: true },
                        },
                        students: { select: { id: true } },
                        lineBotGroups: {
                            where: { isActive: true },
                            select: { id: true, lineGroupId: true },
                        },
                    },
                },
            },
        });

        if (!assignment) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }
        if (assignment.classroom.teacherId !== session.user.id) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }
        if (!canUseLineFeature(assignment.classroom.teacher, "lineAutoReminders")) {
            return createAppErrorResponse(
                "PLAN_LIMIT_AI_FEATURE",
                "การประกาศงานผ่าน LINE ใช้ได้ในแผน Plus หรือ School",
                403
            );
        }

        const groups = assignment.classroom.lineBotGroups;
        if (groups.length === 0) {
            return NextResponse.json({ success: true, lineGroupCount: 0, sentCount: 0 });
        }

        const actionUrl = getStudentPortalUrl();
        const totalStudents = assignment.classroom.students.length;
        const bubble =
            kind === "result"
                ? buildResultAnnounceFlexBubble({
                      classroomName: assignment.classroom.name,
                      assignmentName: assignment.name,
                      actionUrl,
                  })
                : buildAssignmentAnnounceFlexBubble({
                      classroomName: assignment.classroom.name,
                      assignmentName: assignment.name,
                      deadline: assignment.deadline,
                      totalStudents,
                      actionUrl,
                  });

        const altText =
            kind === "result"
                ? `ประกาศผล: ${assignment.name} (ห้อง ${assignment.classroom.name})`
                : `ประกาศงานใหม่: ${assignment.name} (ห้อง ${assignment.classroom.name})`;

        let sentCount = 0;
        let failedCount = 0;
        for (const group of groups) {
            try {
                await pushLineFlex(group.lineGroupId, altText, bubble);
                sentCount += 1;
            } catch (error) {
                failedCount += 1;
                console.error("[ASSIGNMENT_LINE_ANNOUNCE_POST]", error);
            }
        }

        return NextResponse.json({
            success: failedCount === 0,
            kind,
            lineGroupCount: groups.length,
            sentCount,
            failedCount,
        });
    } catch (error) {
        console.error("[ASSIGNMENT_LINE_ANNOUNCE_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
