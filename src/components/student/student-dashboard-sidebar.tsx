"use client";

import type { DashboardStudent } from "@/lib/services/student-dashboard/student-dashboard.types";
import { StudentLearningProfile } from "./student-learning-profile";

interface StudentDashboardSidebarProps {
    student: DashboardStudent;
    classId: string;
    academicTotal: number;
    totalPositive: number;
    totalNegative: number;
}

export function StudentDashboardSidebar({
    student,
    classId,
    academicTotal,
    totalPositive,
    totalNegative,
}: StudentDashboardSidebarProps) {
    return (
        <div className="md:col-span-1 space-y-4">
            <StudentLearningProfile
                studentId={student.id}
                classId={classId}
                loginCode={student.loginCode}
                initialAvatar={student.avatar || student.id}
                name={student.name}
                nickname={student.nickname}
                academicPoints={academicTotal}
                behaviorPoints={student.behaviorPoints}
                totalPositive={totalPositive}
                totalNegative={totalNegative}
            />
        </div>
    );
}
