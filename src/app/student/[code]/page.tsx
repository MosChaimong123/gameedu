import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getThemeBgStyle, getRankEntry, type LevelConfigInput } from "@/lib/classroom-utils";
import type { ClassroomRecord, HistoryRecord } from "@/components/student/StudentDashboardClient";
import { StudentDashboardClient } from "@/components/student/StudentDashboardClient";

type ChecklistItem = string | { text?: string; points?: number };

type StudentSubmission = {
    assignmentId: string;
    score: number;
    submittedAt: Date | string;
};

type ClassroomAssignment = {
    id: string;
    type?: string | null;
    checklists?: ChecklistItem[] | null;
};

type StudentHistory = {
    value: number;
    timestamp: Date | string;
    reason: string;
};

export default async function StudentDashboardPage(
    props: { params: Promise<{ code: string }> }
) {
    const { code } = await props.params;
    const session = await auth();
    const currentUserId = session?.user?.id;

    const student = await db.student.findUnique({
        where: { loginCode: code.toUpperCase() },
        include: {
            classroom: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    emoji: true,
                    theme: true,
                    levelConfig: true,
                    gamifiedSettings: true,
                    teacher: { select: { name: true } },
                    assignments: {
                        orderBy: { order: 'asc' },
                        select: { id: true, name: true, description: true, type: true, maxScore: true, passScore: true, deadline: true, checklists: true, visible: true }
                    }
                }
            },
            history: { orderBy: { timestamp: 'desc' }, take: 30 },
            submissions: { select: { assignmentId: true, score: true, submittedAt: true } }
        }
    });

    if (!student) return notFound();

    const classroom = student.classroom as typeof student.classroom & {
        assignments: ClassroomAssignment[];
        levelConfig?: unknown;
        theme?: string | null;
        emoji?: string | null;
    };
    const history = student.history as StudentHistory[];
    const submissions = student.submissions as StudentSubmission[];
    
    // Helper: calculate total score from bitmask and checklist items with points
    const calculateChecklistScore = (bitmask: number, checklistItems: ChecklistItem[] | null | undefined) => {
        if (!Array.isArray(checklistItems)) return 0;
        return checklistItems.reduce((sum, item, i) => {
            const isChecked = (bitmask & (1 << i)) !== 0;
            const points = typeof item === "object" && item !== null ? (item.points || 0) : 1;
            return isChecked ? sum + points : sum;
        }, 0);
    };

    const submissionMap = new Map(submissions.map((submission) => [submission.assignmentId, submission]));
    const academicTotal = classroom.assignments.reduce((sum: number, assignment) => {
        const submission = submissionMap.get(assignment.id);
        if (!submission) return sum;
        if (assignment.type === "checklist") {
            return sum + calculateChecklistScore(submission.score, assignment.checklists as ChecklistItem[] | null | undefined);
        }
        return sum + submission.score;
    }, 0);
    
    // Rank is now calculated ONLY from academic points
    const rankEntry = getRankEntry(academicTotal, classroom.levelConfig as LevelConfigInput);

    const theme = classroom.theme || "from-indigo-500 to-purple-600";
    const isCustomTheme = theme.startsWith("custom:");
    const themeStyle = isCustomTheme ? getThemeBgStyle(theme) : {};
    const themeClass = isCustomTheme ? "" : `bg-gradient-to-br ${theme}`;

    const classIcon = classroom.emoji;
    const isImageIcon = Boolean(classIcon?.startsWith('data:image') || classIcon?.startsWith('http'));

    const historyRecords: HistoryRecord[] = history.map((h) => ({
        value: h.value,
        reason: h.reason,
        timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : String(h.timestamp),
    }));

    const gamified = classroom.gamifiedSettings;
    const classroomRecord = {
        ...classroom,
        gamifiedSettings:
            gamified !== null &&
            typeof gamified === "object" &&
            !Array.isArray(gamified)
                ? (gamified as Record<string, unknown>)
                : {},
    } as ClassroomRecord;

    const totalPositive = history.filter((entry) => entry.value > 0).reduce((sum: number, entry) => sum + entry.value, 0);
    const totalNegative = Math.abs(history.filter((entry) => entry.value < 0).reduce((sum: number, entry) => sum + entry.value, 0));

    return (
        <StudentDashboardClient 
            student={student}
            classroom={classroomRecord}
            history={historyRecords}
            submissions={submissions}
            academicTotal={academicTotal}
            totalPositive={totalPositive}
            totalNegative={totalNegative}
            rankEntry={rankEntry}
            themeClass={themeClass}
            themeStyle={themeStyle}
            classIcon={classIcon}
            isImageIcon={isImageIcon}
            currentUserId={currentUserId}
            code={code}
        />
    );
}
