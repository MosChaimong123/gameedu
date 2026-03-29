import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ClassroomCard } from "@/components/classroom/classroom-card";
import { ClassroomDashboardHeader } from "@/components/classroom/classroom-dashboard-header";
import { CreateClassroomDialog } from "./create-classroom-dialog";
import { Users } from "lucide-react";

export default async function MyClassroomsPage() {
    const session = await auth();
    if (!session?.user) return redirect("/");

    const classrooms = await db.classroom.findMany({
        where: {
            teacherId: session.user.id
        },
        include: {
            _count: {
                select: { students: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return (
        <div className="space-y-8 p-8">
            <ClassroomDashboardHeader />

            {classrooms.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No classes yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                        Create your first classroom to start tracking student progress and awarding points.
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
