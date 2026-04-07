import type { CSSProperties } from "react";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getThemeBgStyle, getRankEntry, type LevelConfigInput } from "@/lib/classroom-utils";
import { sumAcademicTotal } from "@/lib/academic-score";
import type {
    ClassroomRecord,
    HistoryRecord,
} from "@/components/student/StudentDashboardClient";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";

type StudentSubmission = {
    assignmentId: string;
    score: number;
    submittedAt: Date | string;
};

type ClassroomAssignment = {
    id: string;
    name: string;
    description?: string | null;
    visible?: boolean;
    type?: string | null;
    maxScore?: number | null;
    passScore?: number | null;
    deadline?: Date | null;
    checklists?: unknown;
};

type StudentHistory = {
    value: number;
    timestamp: Date | string;
    reason: string;
};

export type DashboardStudentRecord = {
    id: string;
    classId: string;
    loginCode: string;
    name: string;
    nickname: string | null;
    avatar: string | null;
    userId: string | null;
    behaviorPoints: number;
    gold: number;
    streak: number;
    lastCheckIn: string | null;
    inventory: string[];
    equippedFrame: string | null;
    negamonSkills: string[];
};

type StudentClassroomRecord = {
    id: string;
    name: string;
    image: string | null;
    emoji: string | null;
    theme: string | null;
    levelConfig: unknown;
    gamifiedSettings: unknown;
    teacherId: string;
    assignments: ClassroomAssignment[];
};

export type StudentDashboardData = {
    student: DashboardStudentRecord;
    classroom: ClassroomRecord;
    history: HistoryRecord[];
    submissions: StudentSubmission[];
    academicTotal: number;
    totalPositive: number;
    totalNegative: number;
    rankEntry: ReturnType<typeof getRankEntry>;
    themeClass: string;
    themeStyle: CSSProperties;
    classIcon: string | null;
    isImageIcon: boolean;
};

type StudentDashboardDeps = {
    db: PrismaClient;
};

export async function getStudentDashboard(
    code: string,
    deps: StudentDashboardDeps = { db }
): Promise<StudentDashboardData | null> {
    const student = await deps.db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
        },
        select: {
            id: true,
            classId: true,
            loginCode: true,
            name: true,
            nickname: true,
            avatar: true,
            userId: true,
            behaviorPoints: true,
            gold: true,
            lastCheckIn: true,
            streak: true,
            inventory: true,
            equippedFrame: true,
            negamonSkills: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    emoji: true,
                    theme: true,
                    levelConfig: true,
                    gamifiedSettings: true,
                    teacherId: true,
                    assignments: {
                        orderBy: { order: "asc" },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            type: true,
                            maxScore: true,
                            passScore: true,
                            deadline: true,
                            checklists: true,
                            visible: true,
                        },
                    },
                },
            },
            history: {
                orderBy: { timestamp: "desc" },
                take: 30,
                select: {
                    value: true,
                    timestamp: true,
                    reason: true,
                },
            },
            submissions: {
                select: {
                    assignmentId: true,
                    score: true,
                    submittedAt: true,
                },
            },
        },
    });

    if (!student) return null;

    const teacherUser = await deps.db.user.findUnique({
        where: { id: student.classroom.teacherId },
        select: { name: true },
    });

    const classroom = student.classroom as StudentClassroomRecord;
    const history = student.history as StudentHistory[];
    const submissions = student.submissions as StudentSubmission[];
    const academicTotal = sumAcademicTotal(classroom.assignments, submissions);
    const rankEntry = getRankEntry(academicTotal, classroom.levelConfig as LevelConfigInput);
    const negamonSkills = (student.negamonSkills as string[]) ?? [];

    const studentRecord = {
        id: student.id,
        classId: student.classId,
        loginCode: student.loginCode,
        name: student.name,
        nickname: student.nickname,
        avatar: student.avatar,
        userId: student.userId,
        behaviorPoints: student.behaviorPoints,
        gold: student.gold ?? 0,
        streak: student.streak ?? 0,
        lastCheckIn: student.lastCheckIn instanceof Date
            ? student.lastCheckIn.toISOString()
            : student.lastCheckIn ?? null,
        inventory: (student.inventory as string[]) ?? [],
        equippedFrame: student.equippedFrame ?? null,
        negamonSkills,
    } satisfies DashboardStudentRecord;

    const theme = classroom.theme || "from-indigo-500 to-purple-600";
    const isCustomTheme = theme.startsWith("custom:");
    const themeStyle = isCustomTheme ? getThemeBgStyle(theme) : {};
    const themeClass = isCustomTheme ? "" : `bg-gradient-to-br ${theme}`;
    const classIcon = classroom.emoji;
    const isImageIcon = Boolean(classIcon?.startsWith("data:image") || classIcon?.startsWith("http"));

    const historyRecords: HistoryRecord[] = history.map((entry) => ({
        value: entry.value,
        reason: entry.reason,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : String(entry.timestamp),
    }));

    const gamified = classroom.gamifiedSettings;
    const classroomRecord = {
        ...classroom,
        teacher: { name: teacherUser?.name ?? null },
        gamifiedSettings:
            gamified !== null &&
            typeof gamified === "object" &&
            !Array.isArray(gamified)
                ? (gamified as Record<string, unknown>)
                : {},
    } as ClassroomRecord;

    const totalPositive = history
        .filter((entry) => entry.value > 0)
        .reduce((sum, entry) => sum + entry.value, 0);
    const totalNegative = Math.abs(
        history
            .filter((entry) => entry.value < 0)
            .reduce((sum, entry) => sum + entry.value, 0)
    );


    return {
        student: studentRecord,
        classroom: classroomRecord,
        history: historyRecords,
        submissions,
        academicTotal,
        totalPositive,
        totalNegative,
        rankEntry,
        themeClass,
        themeStyle,
        classIcon,
        isImageIcon,
    };
}
