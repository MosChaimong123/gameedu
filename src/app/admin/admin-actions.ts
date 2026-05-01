"use server"

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/security/audit-log";
import type { Session } from "next-auth";
import { z } from "zod";

type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

async function ensureAdmin(): Promise<Session> {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user || role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }

    return session;
}

export async function updateUserRole(userId: string, newRole: UserRole) {
    const session = await ensureAdmin();
    
    try {
        await db.user.update({
            where: { id: userId },
            data: { role: newRole }
        });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.user.role_updated",
            targetType: "user",
            targetId: userId,
            metadata: { newRole },
        });
        revalidatePath("/admin");
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to update user role:", error);
        return { success: false, error: "Failed to update role" };
    }
}

export type DeleteUserResult =
    | { success: true }
    | { success: false; errorKey: string };

/**
 * Remove related rows that block Prisma user.delete (MongoDB has no automatic FK cascade for most User relations).
 * Order mirrors prisma/seed.ts cleanup for demo teacher.
 */
async function deleteUserRelatedRecords(userId: string): Promise<void> {
    await db.oMRQuiz.deleteMany({ where: { teacherId: userId } });

    const classrooms = await db.classroom.findMany({
        where: { teacherId: userId },
        select: { id: true },
    });
    for (const c of classrooms) {
        await db.classroom.delete({ where: { id: c.id } });
    }

    await db.gameHistory.deleteMany({ where: { hostId: userId } });
    await db.activeGame.deleteMany({ where: { hostId: userId } });
    await db.notification.deleteMany({ where: { userId } });
    await db.session.deleteMany({ where: { userId } });
    await db.account.deleteMany({ where: { userId } });
    await db.questionSet.deleteMany({ where: { creatorId: userId } });
    await db.folder.deleteMany({ where: { creatorId: userId } });
}

export async function deleteUser(userId: string): Promise<DeleteUserResult> {
    const session = await ensureAdmin();

    if (userId === session.user.id) {
        return { success: false, errorKey: "adminUserDeleteFailSelf" };
    }

    try {
        const target = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });
        if (!target) {
            return { success: false, errorKey: "adminUserDeleteFailNotFound" };
        }

        if (target.role === "ADMIN") {
            const adminCount = await db.user.count({ where: { role: "ADMIN" } });
            if (adminCount <= 1) {
                return { success: false, errorKey: "adminUserDeleteFailLastAdmin" };
            }
        }

        await deleteUserRelatedRecords(userId);

        await db.user.delete({
            where: { id: userId },
        });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.user.deleted",
            targetType: "user",
            targetId: userId,
        });
        revalidatePath("/admin");
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete user:", error);
        return { success: false, errorKey: "adminUserDeleteFailDesc" };
    }
}

const subscriptionPlanSchema = z.enum(["FREE", "PLUS", "PRO"]);
const audiencePlansSchema = z.array(subscriptionPlanSchema).min(1);

const updateUserSubscriptionSchema = z.object({
    plan: subscriptionPlanSchema,
    planStatus: z.enum(["ACTIVE", "EXPIRED", "INACTIVE"]).optional(),
    planExpiry: z.string().optional().nullable(),
});

export async function updateUserSubscription(
    userId: string,
    raw: z.infer<typeof updateUserSubscriptionSchema>
) {
    try {
        const session = await ensureAdmin();
        const parsed = updateUserSubscriptionSchema.safeParse(raw);
        if (!parsed.success) {
            return { success: false as const, error: "Invalid subscription payload" };
        }

        let planExpiry: Date | null | undefined;
        if (parsed.data.planExpiry === null || parsed.data.planExpiry === "") {
            planExpiry = null;
        } else if (parsed.data.planExpiry) {
            const d = new Date(parsed.data.planExpiry);
            if (Number.isNaN(d.getTime())) {
                return { success: false as const, error: "Invalid expiry date" };
            }
            planExpiry = d;
        }

        await db.user.update({
            where: { id: userId },
            data: {
                plan: parsed.data.plan,
                ...(parsed.data.planStatus !== undefined ? { planStatus: parsed.data.planStatus } : {}),
                ...(planExpiry !== undefined ? { planExpiry } : {}),
            },
        });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.user.subscription_updated",
            targetType: "user",
            targetId: userId,
            metadata: {
                plan: parsed.data.plan,
                planStatus: parsed.data.planStatus ?? null,
                planExpiry: planExpiry?.toISOString() ?? null,
            },
        });
        revalidatePath("/admin/users");
        return { success: true as const };
    } catch (error) {
        console.error("Failed to update subscription:", error);
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return { success: false as const, error: "Unauthorized: Admin access required" };
        }
        return { success: false as const, error: "Failed to update subscription" };
    }
}

const teacherNewsCreateSchema = z.object({
    title: z.string().min(1),
    body: z.string().optional(),
    tag: z.string().optional().nullable(),
    tagColor: z.string().optional().nullable(),
    mascot: z.string().optional().nullable(),
    sortOrder: z.coerce.number().int().optional().default(0),
    isActive: z.coerce.boolean().optional().default(true),
    audiencePlans: audiencePlansSchema,
});

const teacherNewsUpdateSchema = teacherNewsCreateSchema.extend({
    id: z.string().min(1),
});

export async function createTeacherNewsItem(raw: unknown) {
    const session = await ensureAdmin();
    const parsed = teacherNewsCreateSchema.safeParse(raw);
    if (!parsed.success) {
        return { success: false as const, error: "Invalid news payload" };
    }
    try {
        await db.teacherNewsItem.create({
            data: {
                title: parsed.data.title,
                body: parsed.data.body ?? "",
                tag: parsed.data.tag ?? undefined,
                tagColor: parsed.data.tagColor ?? undefined,
                mascot: parsed.data.mascot ?? undefined,
                sortOrder: parsed.data.sortOrder,
                isActive: parsed.data.isActive,
                audiencePlans: parsed.data.audiencePlans,
            },
        });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.teacher_news.created",
            targetType: "teacherNews",
            metadata: { title: parsed.data.title },
        });
        revalidatePath("/admin/teacher-news");
        revalidatePath("/dashboard");
        return { success: true as const };
    } catch (error) {
        console.error("[createTeacherNewsItem]", error);
        return { success: false as const, error: "Failed to create news" };
    }
}

export async function updateTeacherNewsItem(raw: unknown) {
    const session = await ensureAdmin();
    const parsed = teacherNewsUpdateSchema.safeParse(raw);
    if (!parsed.success) {
        return { success: false as const, error: "Invalid news payload" };
    }
    try {
        await db.teacherNewsItem.update({
            where: { id: parsed.data.id },
            data: {
                title: parsed.data.title,
                body: parsed.data.body ?? "",
                tag: parsed.data.tag ?? undefined,
                tagColor: parsed.data.tagColor ?? undefined,
                mascot: parsed.data.mascot ?? undefined,
                sortOrder: parsed.data.sortOrder,
                isActive: parsed.data.isActive,
                audiencePlans: parsed.data.audiencePlans,
            },
        });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.teacher_news.updated",
            targetType: "teacherNews",
            targetId: parsed.data.id,
        });
        revalidatePath("/admin/teacher-news");
        revalidatePath("/dashboard");
        return { success: true as const };
    } catch (error) {
        console.error("[updateTeacherNewsItem]", error);
        return { success: false as const, error: "Failed to update news" };
    }
}

export async function deleteTeacherNewsItem(id: string) {
    const session = await ensureAdmin();
    try {
        await db.teacherNewsItem.delete({ where: { id } });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.teacher_news.deleted",
            targetType: "teacherNews",
            targetId: id,
        });
        revalidatePath("/admin/teacher-news");
        revalidatePath("/dashboard");
        return { success: true as const };
    } catch (error) {
        console.error("[deleteTeacherNewsItem]", error);
        return { success: false as const, error: "Failed to delete news" };
    }
}

const teacherMissionCreateSchema = z.object({
    title: z.string().min(1),
    reward: z.coerce.number().int().min(0).optional().default(0),
    completedDemo: z.coerce.boolean().optional().default(false),
    mascot: z.string().optional().nullable(),
    sortOrder: z.coerce.number().int().optional().default(0),
    isActive: z.coerce.boolean().optional().default(true),
    audiencePlans: audiencePlansSchema,
});

const teacherMissionUpdateSchema = teacherMissionCreateSchema.extend({
    id: z.string().min(1),
});

export async function createTeacherMission(raw: unknown) {
    const session = await ensureAdmin();
    const parsed = teacherMissionCreateSchema.safeParse(raw);
    if (!parsed.success) {
        return { success: false as const, error: "Invalid mission payload" };
    }
    try {
        await db.teacherMission.create({
            data: {
                title: parsed.data.title,
                reward: parsed.data.reward,
                completedDemo: parsed.data.completedDemo,
                mascot: parsed.data.mascot ?? undefined,
                sortOrder: parsed.data.sortOrder,
                isActive: parsed.data.isActive,
                audiencePlans: parsed.data.audiencePlans,
            },
        });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.teacher_mission.created",
            targetType: "teacherMission",
            metadata: { title: parsed.data.title },
        });
        revalidatePath("/admin/teacher-missions");
        revalidatePath("/dashboard");
        return { success: true as const };
    } catch (error) {
        console.error("[createTeacherMission]", error);
        return { success: false as const, error: "Failed to create mission" };
    }
}

export async function updateTeacherMission(raw: unknown) {
    const session = await ensureAdmin();
    const parsed = teacherMissionUpdateSchema.safeParse(raw);
    if (!parsed.success) {
        return { success: false as const, error: "Invalid mission payload" };
    }
    try {
        await db.teacherMission.update({
            where: { id: parsed.data.id },
            data: {
                title: parsed.data.title,
                reward: parsed.data.reward,
                completedDemo: parsed.data.completedDemo,
                mascot: parsed.data.mascot ?? undefined,
                sortOrder: parsed.data.sortOrder,
                isActive: parsed.data.isActive,
                audiencePlans: parsed.data.audiencePlans,
            },
        });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.teacher_mission.updated",
            targetType: "teacherMission",
            targetId: parsed.data.id,
        });
        revalidatePath("/admin/teacher-missions");
        revalidatePath("/dashboard");
        return { success: true as const };
    } catch (error) {
        console.error("[updateTeacherMission]", error);
        return { success: false as const, error: "Failed to update mission" };
    }
}

export async function deleteTeacherMission(id: string) {
    const session = await ensureAdmin();
    try {
        await db.teacherMission.delete({ where: { id } });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.teacher_mission.deleted",
            targetType: "teacherMission",
            targetId: id,
        });
        revalidatePath("/admin/teacher-missions");
        revalidatePath("/dashboard");
        return { success: true as const };
    } catch (error) {
        console.error("[deleteTeacherMission]", error);
        return { success: false as const, error: "Failed to delete mission" };
    }
}

export async function deleteSet(setId: string) {
    const session = await ensureAdmin();
    
    try {
        await db.questionSet.delete({
            where: { id: setId }
        });
        logAuditEvent({
            actorUserId: session.user.id,
            action: "admin.question_set.deleted",
            targetType: "questionSet",
            targetId: setId,
        });
        revalidatePath("/admin");
        revalidatePath("/admin/sets");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete set:", error);
        return { success: false, error: "Failed to delete set" };
    }
}
