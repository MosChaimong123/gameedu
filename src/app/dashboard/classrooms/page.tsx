import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, getOptionalDbModel } from "@/lib/db";
import { ClassroomCard } from "@/components/classroom/classroom-card";
import { ClassroomDashboardHeader } from "@/components/classroom/classroom-dashboard-header";
import { CreateClassroomDialog } from "./create-classroom-dialog";
import { Users } from "lucide-react";
import { formatTranslation } from "@/lib/format-translation";
import { getRequestLanguage } from "@/lib/request-language";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type LineReminderDeliveryModel = {
    findMany(input: {
        where: { classroomId: { in: string[] } };
        orderBy: { sentAt: "desc" };
        select: { classroomId: true; sentAt: true; targetCount: true; reminderType: true };
    }): Promise<Array<{ classroomId: string; sentAt: Date; targetCount: number; reminderType: string }>>;
};

export default async function MyClassroomsPage() {
    const session = await auth();
    if (!session?.user) return redirect("/");
    if (!isTeacherOrAdmin(session.user.role)) {
        return redirect("/dashboard");
    }
    const lang = await getRequestLanguage();
    const t = (key: string, params?: Record<string, string | number>) => formatTranslation(lang, key, params);

    const classrooms = await db.classroom.findMany({
        where: {
            teacherId: session.user.id
        },
        include: {
            _count: {
                select: { students: true }
            },
            lineBotGroups: {
                where: { isActive: true },
                select: {
                    id: true,
                    lineGroupId: true,
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    const classroomIds = classrooms.map((classroom) => classroom.id);
    const lineLinks = classroomIds.length > 0
        ? await db.lineStudentAccountLink.findMany({
            where: { classroomId: { in: classroomIds } },
            select: { classroomId: true, studentId: true },
        })
        : [];
    const linkedStudentIdsByClassroom = new Map<string, Set<string>>();
    for (const link of lineLinks) {
        const current = linkedStudentIdsByClassroom.get(link.classroomId) ?? new Set<string>();
        current.add(link.studentId);
        linkedStudentIdsByClassroom.set(link.classroomId, current);
    }

    const deliveryModel = getOptionalDbModel<LineReminderDeliveryModel>("lineAssignmentReminderDelivery");
    const deliveries = deliveryModel && classroomIds.length > 0
        ? await deliveryModel
            .findMany({
                where: { classroomId: { in: classroomIds } },
                orderBy: { sentAt: "desc" },
                select: { classroomId: true, sentAt: true, targetCount: true, reminderType: true },
            })
            .catch(() => [])
        : [];
    const latestDeliveryByClassroom = new Map(deliveries.map((delivery) => [delivery.classroomId, delivery]));

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-8">
            <ClassroomDashboardHeader />

            {classrooms.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">{t("classroomsEmptyTitle")}</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                        {t("classroomsEmptyDesc")}
                    </p>
                    <CreateClassroomDialog />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {classrooms.map((c) => (
                        <ClassroomCard
                            key={c.id}
                            classroom={c}
                            studentCount={c._count.students}
                            lineReadiness={{
                                groupCount: c.lineBotGroups.length,
                                linkedStudentCount: linkedStudentIdsByClassroom.get(c.id)?.size ?? 0,
                                studentCount: c._count.students,
                                lastReminderSentAt: latestDeliveryByClassroom.get(c.id)?.sentAt ?? null,
                                lastReminderTargetCount: latestDeliveryByClassroom.get(c.id)?.targetCount ?? null,
                                lastReminderType: latestDeliveryByClassroom.get(c.id)?.reminderType ?? null,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
