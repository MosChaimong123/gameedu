import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import type { messagingApi } from "@line/bot-sdk";
import { db } from "@/lib/db";
import { pushLineFlex } from "@/lib/line-bot/client";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";
import { createMissingStudentNameResolver } from "@/lib/line-bot/missing-student-names";
import { buildReminderFlexBubble, type ReminderFlexTone } from "@/lib/line-bot/reminder-flex";
import { isTeacherOrAdmin } from "@/lib/role-guards";

function getAppUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.LINE_BOT_CHAT_URL?.trim() || undefined;
}

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
                students: { select: { id: true, name: true } },
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
                const missing = classroom.students.filter((student) => !submitted.has(student.id));
                const deadline = assignment.deadline ?? null;
                const overdue = Boolean(deadline && deadline < now);
                const dueSoon = Boolean(deadline && deadline >= now && deadline <= soonHorizon);

                return {
                    assignmentId: assignment.id,
                    name: assignment.name,
                    type: assignment.type,
                    deadline,
                    missingSubmissions: missing.length,
                    overdue,
                    dueSoon,
                    missingStudentList: missing.map((student) => ({ id: student.id, name: student.name })),
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

        // LINE carousels allow at most 12 bubbles. Show the most urgent assignments.
        const carouselAssignments = summaryAssignments
            .filter((assignment) => assignment.missingSubmissions > 0)
            .slice(0, 12);

        let sentCount = 0;
        let failedCount = 0;
        for (const group of groups) {
            try {
                const resolveMissingNames = await createMissingStudentNameResolver({
                    lineGroupId: group.lineGroupId,
                    classroomId: classroom.id,
                });
                const bubbles: messagingApi.FlexBubble[] = [];
                for (const assignment of carouselAssignments) {
                    const tone: ReminderFlexTone = assignment.overdue
                        ? "overdue"
                        : assignment.dueSoon
                          ? "today"
                          : "before";
                    const missingStudents = await resolveMissingNames(assignment.missingStudentList);
                    bubbles.push(
                        buildReminderFlexBubble({
                            tone,
                            classroomName: classroom.name,
                            assignmentName: assignment.name,
                            deadline: assignment.deadline,
                            missingSubmissions: assignment.missingSubmissions,
                            totalStudents: classroom.students.length,
                            missingStudents,
                            footerUrl: getAppUrl(),
                        })
                    );
                }

                if (bubbles.length === 0) {
                    continue;
                }

                const contents: messagingApi.FlexContainer =
                    bubbles.length === 1 ? bubbles[0] : { type: "carousel", contents: bubbles };
                await pushLineFlex(
                    group.lineGroupId,
                    `กริ่งเตือนงานค้าง ห้อง ${classroom.name} (${carouselAssignments.length} งาน)`,
                    contents
                );
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
