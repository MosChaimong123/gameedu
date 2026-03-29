import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ClassroomDashboard } from "@/components/classroom/classroom-dashboard";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { AnalyticsDashboard } from "@/components/classroom/AnalyticsDashboard";
import { AttendanceHistoryTab } from "@/components/classroom/attendance-history-tab";
import { TranslatedTabsTriggers } from "@/components/classroom/translated-tabs-triggers";
import { ClassBoard } from "@/components/board/ClassBoard";
import { PageBackLink } from "@/components/ui/page-back-link";
interface ClassroomPageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams?: Promise<{ tab?: string }>;
}

export default async function ClassroomPage(props: ClassroomPageProps) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const defaultTab = searchParams?.tab || "classroom";
    const session = await auth();
    if (!session?.user) return redirect("/");

    const classroom = await db.classroom.findUnique({
        where: {
            id: params.id,
        },
        include: {
            students: {
                orderBy: { name: 'asc' },
                include: { submissions: true }
            },
            skills: true,
            assignments: {
                orderBy: { order: 'asc' }
            }
        }
    });

    if (!classroom) {
        return notFound();
    }

    // Authorization Check
    if (classroom.teacherId !== session.user.id) {
        return redirect("/dashboard/classrooms");
    }

    return (
        <div className="h-[calc(100vh-80px)] p-6 overflow-hidden flex flex-col">
            <PageBackLink href="/dashboard/classrooms" label="รายการห้องเรียน" className="mb-3 shrink-0 self-start" />
            <Tabs defaultValue={defaultTab} className="w-full flex-1 flex flex-col min-h-0">
                <TabsList className="mb-4">
                    <TranslatedTabsTriggers />
                </TabsList>

                <TabsContent value="classroom" className="flex-1 mt-0 h-full">
                    {/* Height calculation to fit within dashboard layout without double scrollbars */}
                    <ClassroomDashboard classroom={classroom} />
                </TabsContent>

                <TabsContent value="attendance" className="flex-1 mt-0 h-full overflow-y-auto">
                    <AttendanceHistoryTab classId={classroom.id} />
                </TabsContent>

                <TabsContent value="analytics" className="flex-1 mt-0 h-full overflow-y-auto">
                    <AnalyticsDashboard classId={classroom.id} />
                </TabsContent>

                <TabsContent value="board" className="flex-1 mt-0 h-full overflow-y-auto p-4 bg-slate-50/50">
                    <ClassBoard classId={classroom.id} userId={session.user.id} isTeacher={true} />
                </TabsContent>

            </Tabs>
        </div>
    );
}
