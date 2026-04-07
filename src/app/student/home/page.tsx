import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
    StudentHomeContent,
    type StudentHomeSerializableRecord,
} from "./student-home-content";

export default async function StudentHomePage() {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!session?.user || !userId) redirect("/login");

    if (role === "TEACHER" || role === "ADMIN") redirect("/dashboard");

    const rows = await db.student.findMany({
        where: { userId },
        select: {
            id: true,
            loginCode: true,
            behaviorPoints: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                    emoji: true,
                    theme: true,
                    teacherId: true,
                    assignments: {
                        where: { visible: true },
                        select: {
                            id: true,
                            name: true,
                            maxScore: true,
                            deadline: true,
                            type: true,
                            description: true,
                        },
                    },
                },
            },
            submissions: {
                select: {
                    assignmentId: true,
                    score: true,
                },
            },
            history: {
                orderBy: { timestamp: "desc" },
                take: 5,
                select: {
                    id: true,
                    reason: true,
                    value: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    const teacherIds = [...new Set(rows.map((r) => r.classroom.teacherId))];
    const teachers =
        teacherIds.length > 0
            ? await db.user.findMany({
                  where: { id: { in: teacherIds } },
                  select: { id: true, name: true },
              })
            : [];
    const teacherNameById = new Map(teachers.map((u) => [u.id, u.name]));

    const studentRecords: StudentHomeSerializableRecord[] = rows.map((r) => ({
        id: r.id,
        loginCode: r.loginCode,
        behaviorPoints: r.behaviorPoints,
        classroom: {
            id: r.classroom.id,
            name: r.classroom.name,
            emoji: r.classroom.emoji,
            theme: r.classroom.theme,
            teacherName: teacherNameById.get(r.classroom.teacherId) ?? null,
            assignments: r.classroom.assignments.map((a) => ({
                id: a.id,
                name: a.name,
                maxScore: a.maxScore,
                type: a.type,
                description: a.description,
                deadline: a.deadline ? a.deadline.toISOString() : null,
            })),
        },
        submissions: r.submissions,
        history: r.history,
    }));

    return (
        <StudentHomeContent
            userName={session.user.name ?? null}
            userImage={session.user.image ?? null}
            studentRecords={studentRecords}
        />
    );
}
