"use client";

import { MessageSquare } from "lucide-react";
import { ClassBoard } from "@/components/board/ClassBoard";
import { SyncAccountButton } from "./sync-account-button";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StudentDashboardTranslateFn } from "@/lib/services/student-dashboard/student-dashboard.types";

interface StudentDashboardBoardTabProps {
    t: StudentDashboardTranslateFn;
    classId: string;
    studentId: string;
    currentUserId?: string;
    studentUserId?: string | null;
    code: string;
    canAccessBoard: boolean;
}

export function StudentDashboardBoardTab({
    t,
    classId,
    studentId,
    currentUserId,
    studentUserId,
    code,
    canAccessBoard,
}: StudentDashboardBoardTabProps) {
    return (
        <TabsContent value="board" className="mt-0 border-none p-0 outline-hidden">
            {canAccessBoard ? (
                <ClassBoard
                    classId={classId}
                    studentId={studentId}
                    userId={currentUserId}
                    isTeacher={false}
                />
            ) : (
                <Card className="rounded-[2rem] border-white/60 bg-white/70 backdrop-blur-md shadow-sm">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-black text-slate-800">{t("studentDashBoardGateTitle")}</h3>
                            <p className="text-sm text-slate-500 max-w-xl mx-auto">
                                {t("studentDashBoardGateBody")}
                            </p>
                        </div>
                        {currentUserId && !studentUserId ? (
                            <div className="flex justify-center">
                                <SyncAccountButton loginCode={code} />
                            </div>
                        ) : (
                            <Badge variant="outline" className="border-slate-200 text-slate-500 px-3 py-1 rounded-full">
                                {t("studentDashBoardLoginHint")}
                            </Badge>
                        )}
                    </CardContent>
                </Card>
            )}
        </TabsContent>
    );
}
