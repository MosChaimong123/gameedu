"use server"

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/security/audit-log";
import type { Session } from "next-auth";

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

export async function deleteUser(userId: string) {
    const session = await ensureAdmin();
    
    try {
        // Note: In a real app, we might want to handle cascading deletes or soft deletes
        await db.user.delete({
            where: { id: userId }
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
        return { success: false, error: "Failed to delete user" };
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
