"use client";

import { StudentAvatarSection } from "./student-avatar-section";
import type {
    DashboardStudent,
    StudentDashboardMode,
} from "@/lib/services/student-dashboard/student-dashboard.types";
import type { RankEntry, LevelConfigInput } from "@/lib/classroom-utils";

interface GameProfileMonster {
    icon: string;
    color: string;
    formName: string;
}

interface StudentDashboardSidebarProps {
    student: DashboardStudent;
    classId: string;
    academicTotal: number;
    totalGoldRate: number;
    rankEntry: RankEntry;
    totalPositive: number;
    totalNegative: number;
    themeClass: string;
    themeStyle: React.CSSProperties;
    levelConfigResolved: LevelConfigInput;
    mode: StudentDashboardMode;
    questGold?: number;
    /** โหมดเกม: แสดงมอน Negamon ในการ์ดโปรไฟล์แทนอวาตาร์ */
    gameProfileMonster?: GameProfileMonster | null;
}

export function StudentDashboardSidebar({
    student,
    classId,
    academicTotal,
    totalGoldRate,
    rankEntry,
    totalPositive,
    totalNegative,
    themeClass,
    themeStyle,
    levelConfigResolved,
    mode,
    questGold,
    gameProfileMonster,
}: StudentDashboardSidebarProps) {
    return (
        <div className="md:col-span-1 space-y-4">
            <StudentAvatarSection
                studentId={student.id}
                classId={classId}
                loginCode={student.loginCode}
                initialAvatar={student.avatar || student.id}
                name={student.name}
                nickname={student.nickname}
                points={academicTotal}
                behaviorPoints={student.behaviorPoints}
                initialGold={student.gold}
                goldRate={totalGoldRate}
                rankEntry={rankEntry}
                totalPositive={totalPositive}
                totalNegative={totalNegative}
                themeClass={themeClass}
                themeStyle={themeStyle}
                levelConfig={levelConfigResolved}
                initialInventory={student.inventory}
                initialEquippedFrame={student.equippedFrame}
                initialStreak={student.streak}
                lastCheckIn={student.lastCheckIn}
                mode={mode}
                externalGold={questGold}
                gameProfileMonster={gameProfileMonster}
            />
        </div>
    );
}
