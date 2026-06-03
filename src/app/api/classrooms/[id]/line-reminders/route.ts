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
import { pushLineText } from "@/lib/line-bot/client";
import { formatClassroomWorkReminder } from "@/lib/line-bot/commands";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                teacherId: true,
                teacher: {
                    select: {
                        role: true,
                        plan: true,
                        planStatus: true,
                        planExpiry: true,
                    },
                },
                students: { select: { id: true } },
                lineBotGroups: {
                    where: { isActive: true },
                    select: { id: true, lineGroupId: true },
                },
                assignments: {
                    where: { visible: true },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        deadline: true,
                        submissions: { select: { studentId: true } },
                    },
                },
            },
        });

        if (!classroom) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        if (classroom.teacherId !== session.user.id) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        if (!canUseLineFeature(classroom.teacher, "lineAutoReminders")) {
            return createAppErrorResponse(
                "PLAN_LIMIT_AI_FEATURE",
                "Manual LINE reminders from the classroom page require PLUS or School plan",
                403
            );
        }

        const now = new Date();
        const soonHorizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const summaryAssignments = classroom.assignments
            .map((assignment) => {
                const submitted = new Set(assignment.submissions.map((submission) => submission.studentId));
                const missingSubmissions = classroom.students.filter((student) => !submitted.has(student.id)).length;
                const deadline = assignment.deadline ?? null;
                const overdue = Boolean(deadline && deadline < now);
                const dueSoon = Boolean(deadline && deadline >= now && deadline <= soonHorizon);

                return {
                    assignmentId: assignment.id,
                    name: assignment.name,
                    type: assignment.type,
                    deadline,
                    missingSubmissions,
                    overdue,
                    dueSoon,
                };
            })
            .filter((assignment) => assignment.missingSubmissions > 0 || assignment.overdue || assignment.dueSoon)
            .sort((a, b) => {
                const aPriority = a.overdue ? 0 : a.dueSoon ? 1 : 2;
                const bPriority = b.overdue ? 0 : b.dueSoon ? 1 : 2;
                if (aPriority !== bPriority) return aPriority - bPriority;
                if (a.missingSubmissions !== b.missingSubmissions) {
                    return b.missingSubmissions - a.missingSubmissions;
                }
                return (a.deadline?.getTime() ?? Number.POSITIVE_INFINITY) - (b.deadline?.getTime() ?? Number.POSITIVE_INFINITY);
            });

        const missingSubmissionSlots = summaryAssignments.reduce(
            (sum, assignment) => sum + assignment.missingSubmissions,
            0
        );

        const message = formatClassroomWorkReminder({
            classroomName: classroom.name,
            studentCount: classroom.students.length,
            assignments: summaryAssignments,
            totals: {
                visibleAssignments: classroom.assignments.length,
                overdueAssignments: summaryAssignments.filter((assignment) => assignment.overdue).length,
                dueSoonAssignments: summaryAssignments.filter((assignment) => assignment.dueSoon).length,
                missingSubmissionSlots,
            },
        });

        const groups = classroom.lineBotGroups;
        if (groups.length === 0) {
            return NextResponse.json({
                success: true,
                lineGroupCount: 0,
                sentCount: 0,
                assignmentCount: summaryAssignments.length,
                missingSubmissionSlots,
            });
        }

        let sentCount = 0;
        let failedCount = 0;
        for (const group of groups) {
            try {
                await pushLineText(group.lineGroupId, message);
                sentCount += 1;
            } catch (error) {
                failedCount += 1;
                console.error("[CLASSROOM_LINE_REMINDERS_POST]", error);
            }
        }

        return NextResponse.json({
            success: failedCount === 0,
            lineGroupCount: groups.length,
            sentCount,
            failedCount,
            assignmentCount: summaryAssignments.length,
            missingSubmissionSlots,
        });
    } catch (error) {
        console.error("[CLASSROOM_LINE_REMINDERS_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
