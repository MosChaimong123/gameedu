"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function joinClassroom(loginCode: string) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return { error: "Authentication required" };
    }

    const upperCode = loginCode.trim().toUpperCase();

    try {
        // 1. Find the student record with this code
        const student = await db.student.findUnique({
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
        await db.student.update({
            where: { id: student.id },
            data: { userId }
        });

        revalidatePath("/student/home");
        return { success: true, className: student.classroom.name };
    } catch (error) {
        console.error("[JOIN_CLASSROOM_ERROR]", error);
        return { error: "Failed to join classroom" };
    }
}
