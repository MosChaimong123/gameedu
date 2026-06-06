/**
 * GET /api/admin/ops/metrics
 *
 * Operational metrics for the admin dashboard.
 * ADMIN role required.
 *
 * Returns:
 * - Plan distribution (FREE / PLUS / PRO user counts)
 * - LINE usage stats (active groups, linked students, submissions this month)
 * - Classroom & student totals
 * - System info (uptime, node env)
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { isLineBotConfigured } from "@/lib/line-bot/config";
import { isR2Configured } from "@/lib/storage/r2-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function startOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET(): Promise<Response> {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (session.user.role !== "ADMIN") {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const monthStart = startOfCurrentMonth();

    const [
        // Plan distribution
        freeCount,
        plusCount,
        proCount,
        totalUsers,
        // Classroom & student
        totalClassrooms,
        totalStudents,
        classroomsWithLineGroup,
        // LINE stats
        activeLineGroups,
        linkedStudents,
        lineSubmissionsThisMonth,
    ] = await Promise.all([
        db.user.count({ where: { plan: "FREE" } }),
        db.user.count({ where: { plan: "PLUS" } }),
        db.user.count({ where: { plan: "PRO" } }),
        db.user.count(),
        db.classroom.count(),
        db.student.count(),
        db.classroom.count({ where: { lineBotGroups: { some: { isActive: true } } } }),
        // Active LINE groups
        db.lineBotGroup.count({ where: { isActive: true } }).catch(() => 0),
        // Students with persistent LINE account links
        db.lineStudentAccountLink.count().catch(() => 0),
        // LINE text submissions this month (mode=line_text)
        db.assignmentSubmission.count({
            where: {
                content: { contains: '"submittedVia":"line"' },
                submittedAt: { gte: monthStart },
            },
        }).catch(() => 0),
    ]);

    const lineBotConfigured = isLineBotConfigured();
    const r2Configured = isR2Configured();

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        system: {
            nodeEnv: process.env.NODE_ENV ?? "unknown",
            uptimeSeconds: Math.floor(process.uptime()),
            lineBotConfigured,
            r2Configured,
        },
        plans: {
            FREE: freeCount,
            PLUS: plusCount,
            PRO: proCount,
            total: totalUsers,
            upgradeRate:
                totalUsers > 0
                    ? Math.round(((plusCount + proCount) / totalUsers) * 10000) / 100
                    : 0,
        },
        classrooms: {
            total: totalClassrooms,
            withLineGroup: classroomsWithLineGroup,
        },
        students: {
            total: totalStudents,
        },
        line: {
            activeGroups: activeLineGroups,
            linkedStudents,
            submissionsThisMonth: lineSubmissionsThisMonth,
        },
    });
}
