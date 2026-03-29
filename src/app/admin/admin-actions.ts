"use server"

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

async function ensureAdmin() {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
}

export async function updateUserRole(userId: string, newRole: UserRole) {
    await ensureAdmin();
    
    try {
        await db.user.update({
            where: { id: userId },
            data: { role: newRole }
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
    await ensureAdmin();
    
    try {
        // Note: In a real app, we might want to handle cascading deletes or soft deletes
        await db.user.delete({
            where: { id: userId }
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
    await ensureAdmin();
    
    try {
        await db.questionSet.delete({
            where: { id: setId }
        });
        revalidatePath("/admin");
        revalidatePath("/admin/sets");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete set:", error);
        return { success: false, error: "Failed to delete set" };
    }
}
