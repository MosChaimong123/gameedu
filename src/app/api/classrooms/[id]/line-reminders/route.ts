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
import {
    getDeliveryModel,
    recordDelivery,
    markDeliverySent,
    markDeliveryFailed,
    classifyDispatchError,
} from "@/lib/line-bot/delivery-contract";
import { bangkokDateKey as bkDateKey } from "@/lib/line-bot/bangkok-date";

/** Minimum seconds between manual sends per classroom (prevents double-tap spam). */
const MANUAL_COOLDOWN_SECONDS = 60;

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
                    select: { role: true, plan: true, planStatus: true, planExpiry: true },
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

        // ── Idempotency / cooldown check ──────────────────────────────────────
        // Prevent double-taps: if a manual delivery was created for this classroom
        // less than MANUAL_COOLDOWN_SECONDS ago, return 429.
        const deliveryModel = getDeliveryModel();
        if (deliveryModel) {
            type RecentCheckModel = {
                findFirst(input: {
                    where: { classroomId: string; reminderType: string };
                    orderBy: { sentAt: "desc" };
                    select: { sentAt: true };
                }): Promise<{ sentAt: Date } | null>;
            };
            const recentModel = deliveryModel as unknown as RecentCheckModel;
            try {
                const recent = await recentModel.findFirst({
                    where: { classroomId: id, reminderType: "manual_classroom" },
                    orderBy: { sentAt: "desc" },
                    select: { sentAt: true },
                });
                if (recent) {
                    const secondsAgo = (Date.now() - recent.sentAt.getTime()) / 1000;
                    if (secondsAgo < MANUAL_COOLDOWN_SECONDS) {
                        const retryAfter = Math.ceil(MANUAL_COOLDOWN_SECONDS - secondsAgo);
                        return NextResponse.json(
                            { ok: false, error: "COOLDOWN", retryAfterSeconds: retryAfter },
                            { status: 429, headers: { "Retry-After": String(retryAfter) } }
                        );
                    }
                }
            } catch {
                // If the model doesn't support findFirst, skip cooldown check gracefully
            }
        }

        // ── Build assignment summary ───────────────────────────────────────────
        const now = new Date();
        const soonHorizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const summaryAssignments = classroom.assignments
            .map((assignment) => {
                const submitted = new Set(assignment.submissions.map((s) => s.studentId));
                const missing = classroom.students.filter((s) => !submitted.has(s.id));
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
                    missingStudentList: missing.map((s) => ({ id: s.id, name: s.name })),
                };
            })
            .filter((a) => a.missingSubmissions > 0 || a.overdue || a.dueSoon)
            .sort((a, b) => {
                const aPriority = a.overdue ? 0 : a.dueSoon ? 1 : 2;
                const bPriority = b.overdue ? 0 : b.dueSoon ? 1 : 2;
                if (aPriority !== bPriority) return aPriority - bPriority;
                if (a.missingSubmissions !== b.missingSubmissions) return b.missingSubmissions - a.missingSubmissions;
                return (a.deadline?.getTime() ?? Number.POSITIVE_INFINITY) - (b.deadline?.getTime() ?? Number.POSITIVE_INFINITY);
            });

        const missingSubmissionSlots = summaryAssignments.reduce((sum, a) => sum + a.missingSubmissions, 0);
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
            .filter((a) => a.missingSubmissions > 0)
            .slice(0, 12);

        // Use Bangkok date as part of the manual key so deduplication works per-day
        const manualDateKey = bkDateKey(now);
        let sentCount = 0;
        let failedCount = 0;

        for (const group of groups) {
            // Collect delivery record IDs created for this group so we can mark them
            const deliveryIds: string[] = [];

            try {
                const resolveMissingNames = await createMissingStudentNameResolver({
                    lineGroupId: group.lineGroupId,
                    classroomId: classroom.id,
                });
                const bubbles: messagingApi.FlexBubble[] = [];
                for (const assignment of carouselAssignments) {
                    const tone: ReminderFlexTone = assignment.overdue ? "overdue" : assignment.dueSoon ? "today" : "before";
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

                if (bubbles.length === 0) continue;

                // Create pending delivery records before pushing to LINE
                if (deliveryModel) {
                    for (const assignment of carouselAssignments) {
                        const key = `manual_classroom:${manualDateKey}:${assignment.assignmentId}`;
                        const result = await recordDelivery(deliveryModel, {
                            lineBotGroupId: group.id,
                            lineGroupId: group.lineGroupId,
                            classroomId: classroom.id,
                            assignmentId: assignment.assignmentId,
                            reminderKey: key,
                            reminderType: "manual_classroom",
                            targetCount: assignment.missingSubmissions,
                            triggeredBy: "manual",
                        });
                        if (result.type === "created") {
                            deliveryIds.push(result.id);
                        }
                        // duplicate = already sent today for this assignment, skip silently
                    }
                }

                const contents: messagingApi.FlexContainer =
                    bubbles.length === 1 ? bubbles[0] : { type: "carousel", contents: bubbles };
                await pushLineFlex(
                    group.lineGroupId,
                    `กริ่งเตือนงานค้าง ห้อง ${classroom.name} (${carouselAssignments.length} งาน)`,
                    contents
                );

                // Mark all created records as sent
                if (deliveryModel) {
                    await Promise.allSettled(
                        deliveryIds.map((deliveryId) => markDeliverySent(deliveryModel, deliveryId))
                    );
                }
                sentCount += 1;
            } catch (error) {
                failedCount += 1;
                const errorCode = classifyDispatchError(error);
                // Mark all pending records as failed
                if (deliveryModel && deliveryIds.length > 0) {
                    await Promise.allSettled(
                        deliveryIds.map((deliveryId) =>
                            markDeliveryFailed(deliveryModel, deliveryId, errorCode, error)
                        )
                    );
                }
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
