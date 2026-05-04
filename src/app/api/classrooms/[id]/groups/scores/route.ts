import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { sumAcademicTotal } from "@/lib/academic-score";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import {
    canLoginCodeAccessClassroom,
    canUserAccessClassroom,
} from "@/lib/authorization/resource-access";
import { db } from "@/lib/db";

type SubGroup = { name: string; studentIds: string[] };

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();
    const loginCode = new URL(req.url).searchParams.get("code")?.trim().toUpperCase();

    if (!session?.user?.id && !loginCode) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    let canAccess = false;

    if (session?.user?.id) {
        canAccess = await canUserAccessClassroom(db, session.user.id, id);
    }

    if (!canAccess && loginCode) {
        canAccess = await canLoginCodeAccessClassroom(db, loginCode, id);
    }

    if (!canAccess) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const groupSets = await db.studentGroup.findMany({
            where: { classId: id },
            orderBy: { createdAt: "desc" },
        });

        if (groupSets.length === 0) {
            return NextResponse.json({ groupSets: [] });
        }

        const allStudentIds = new Set<string>();
        const parsedSets = groupSets.map((gs) => ({
            id: gs.id,
            name: gs.name,
            subGroups: (gs.studentIds as string[]).map((raw) => {
                try {
                    return JSON.parse(raw) as SubGroup;
                } catch {
                    return { name: "", studentIds: [] } as SubGroup;
                }
            }),
        }));

        parsedSets.forEach((gs) => {
            gs.subGroups.forEach((sg) => {
                sg.studentIds.forEach((sid) => allStudentIds.add(sid));
            });
        });

        if (allStudentIds.size === 0) {
            return NextResponse.json({
                groupSets: parsedSets.map((gs) => ({
                    ...gs,
                    subGroups: gs.subGroups.map((sg) => ({
                        ...sg,
                        score: 0,
                        studentCount: sg.studentIds.length,
                    })),
                })),
            });
        }

        const students = await db.student.findMany({
            where: { id: { in: [...allStudentIds] }, classId: id },
            select: {
                id: true,
                name: true,
                avatar: true,
                submissions: { select: { assignmentId: true, score: true, submittedAt: true } },
            },
        });

        const classroom = await db.classroom.findUnique({
            where: { id },
            select: { assignments: { select: { id: true, type: true, maxScore: true, checklists: true } } },
        });
        const assignments = classroom?.assignments ?? [];

        const scoreMap = new Map<string, number>();
        students.forEach((student) => {
            const total = sumAcademicTotal(
                assignments as Parameters<typeof sumAcademicTotal>[0],
                student.submissions as Parameters<typeof sumAcademicTotal>[1]
            );
            scoreMap.set(student.id, total);
        });

        const studentInfoMap = new Map(students.map((s) => [s.id, { name: s.name, avatar: s.avatar }]));

        const result = parsedSets.map((gs) => ({
            id: gs.id,
            name: gs.name,
            subGroups: gs.subGroups
                .map((sg) => ({
                    name: sg.name,
                    studentCount: sg.studentIds.length,
                    score: sg.studentIds.reduce((sum, sid) => sum + (scoreMap.get(sid) ?? 0), 0),
                    members: sg.studentIds.map((sid) => ({
                        id: sid,
                        name: studentInfoMap.get(sid)?.name ?? "?",
                        avatar: studentInfoMap.get(sid)?.avatar ?? null,
                        score: scoreMap.get(sid) ?? 0,
                    })),
                }))
                .sort((a, b) => b.score - a.score),
        }));

        return NextResponse.json({ groupSets: result });
    } catch (error) {
        console.error("Error fetching group scores:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
