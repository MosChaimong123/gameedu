import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ClassroomDashboard } from "@/components/classroom/classroom-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportsTab } from "@/components/classroom/reports-tab";

interface ClassroomPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ClassroomPage(props: ClassroomPageProps) {
    const params = await props.params;
    const session = await auth();
    if (!session?.user) return redirect("/");

    const classroom = await db.classroom.findUnique({
        where: {
            id: params.id,
        },
        include: {
            students: {
                orderBy: { name: 'asc' }
            },
            skills: true
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
            <Tabs defaultValue="classroom" className="w-full flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="classroom">Classroom</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="classroom" className="flex-1 mt-0 h-full">
                    {/* Height calculation to fit within dashboard layout without double scrollbars */}
                    <ClassroomDashboard classroom={classroom} />
                </TabsContent>
                
                <TabsContent value="reports" className="flex-1 mt-0 h-full overflow-y-auto">
                    <ReportsTab classId={classroom.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
