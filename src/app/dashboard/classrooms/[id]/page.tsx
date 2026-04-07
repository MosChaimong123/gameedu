import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ClassroomDashboard } from "@/components/classroom/classroom-dashboard";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { AnalyticsDashboard } from "@/components/classroom/AnalyticsDashboard";
import { AttendanceHistoryTab } from "@/components/classroom/attendance-history-tab";
import { TranslatedTabsTriggers } from "@/components/classroom/translated-tabs-triggers";
import { ClassBoard } from "@/components/board/ClassBoard";
import { ClassroomPageBackLink } from "./classroom-page-back-link";
import { getClassroomDashboard } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

interface ClassroomPageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams?: Promise<{
        tab?: string;
        focus?: string;
        highlightAssignmentId?: string;
    }>;
}

type ClassroomPageQuery = {
    defaultTab: "classroom" | "attendance" | "analytics" | "board";
    classFocus: "assignments" | null;
    highlightAssignmentId: string | null;
};

export function normalizeClassroomPageQuery(searchParams?: {
    tab?: string;
    focus?: string;
    highlightAssignmentId?: string;
}): ClassroomPageQuery {
    const tabParam = searchParams?.tab;
    const allowedTabs = new Set(["classroom", "attendance", "analytics", "board"]);
    const defaultTab = (
        tabParam && allowedTabs.has(tabParam) ? tabParam : "classroom"
    ) as ClassroomPageQuery["defaultTab"];

    const focusParam = searchParams?.focus;
    const classFocus = focusParam === "assignments" ? "assignments" : null;
    const rawHighlight = searchParams?.highlightAssignmentId?.trim();
    const highlightAssignmentId =
        rawHighlight && OBJECT_ID_RE.test(rawHighlight) ? rawHighlight : null;

    return { defaultTab, classFocus, highlightAssignmentId };
}

export default async function ClassroomPage(props: ClassroomPageProps) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const { defaultTab, classFocus, highlightAssignmentId } = normalizeClassroomPageQuery(searchParams);
    const session = await auth();
    if (!session?.user) return redirect("/");

    const classroom = await getClassroomDashboard(params.id);

    if (!classroom) {
        return notFound();
    }

    // Authorization Check
    if (classroom.teacherId !== session.user.id) {
        return redirect("/dashboard/classrooms");
    }

    return (
        <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
            <ClassroomPageBackLink className="mb-3 shrink-0 self-start" />
            <Tabs
                key={`${params.id}-${defaultTab}-${classFocus ?? ""}-${highlightAssignmentId ?? ""}`}
                defaultValue={defaultTab}
                className="flex w-full flex-1 flex-col"
            >
                <TabsList className="mb-4 h-auto w-full justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1.5 text-slate-700 shadow-sm">
                    <TranslatedTabsTriggers />
                </TabsList>

                <TabsContent value="classroom" className="mt-0 flex-1">
                    {/* Height calculation to fit within dashboard layout without double scrollbars */}
                    <ClassroomDashboard
                        classroom={classroom}
                        initialClassFocus={classFocus}
                        highlightAssignmentId={highlightAssignmentId}
                    />
                </TabsContent>

                <TabsContent value="attendance" className="mt-0 flex-1 overflow-y-auto">
                    <AttendanceHistoryTab classId={classroom.id} />
                </TabsContent>

                <TabsContent value="analytics" className="mt-0 flex-1 overflow-y-auto">
                    <AnalyticsDashboard classId={classroom.id} />
                </TabsContent>

                <TabsContent value="board" className="mt-0 flex-1 overflow-y-auto bg-slate-50/50 p-4">
                    <ClassBoard classId={classroom.id} userId={session.user.id} isTeacher={true} />
                </TabsContent>

            </Tabs>
        </div>
    );
}
