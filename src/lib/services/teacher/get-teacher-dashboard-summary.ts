import { db } from "@/lib/db";

/** An unfinished piece of work the teacher can pick back up. */
export type TeacherDashboardPendingItem = {
    id: string;
    kind: "questionSet" | "lessonDraft";
    title: string;
    href: string;
    updatedAt: string;
};

/** A game the teacher has already hosted. */
export type TeacherDashboardRecentGame = {
    id: string;
    gameMode: string;
    playerCount: number;
    endedAt: string;
};

export type TeacherDashboardSummary = {
    questionSetCount: number;
    classroomCount: number;
    studentCount: number;
    gamesThisWeek: number;
    pendingItems: TeacherDashboardPendingItem[];
    recentGames: TeacherDashboardRecentGame[];
};

const EMPTY_SUMMARY: TeacherDashboardSummary = {
    questionSetCount: 0,
    classroomCount: 0,
    studentCount: 0,
    gamesThisWeek: 0,
    pendingItems: [],
    recentGames: [],
};

const PENDING_ITEMS_PER_SOURCE = 3;
const RECENT_GAMES_LIMIT = 5;

const WEEK_IN_DAYS = 7;

function startOfTrailingWeek(now = new Date()): Date {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - WEEK_IN_DAYS);
    return start;
}

/**
 * Headline counts for the teacher dashboard. Rendered on the server alongside
 * the rest of the page, so there is no loading state to design for — but a
 * failed count must not take the whole dashboard down with it, so each figure
 * falls back to zero on its own.
 */
export async function getTeacherDashboardSummary(
    teacherId: string | undefined
): Promise<TeacherDashboardSummary> {
    if (!teacherId) return EMPTY_SUMMARY;

    const since = startOfTrailingWeek();

    const [questionSetCount, classroomCount, studentCount, gamesThisWeek, recentSets, lessonDrafts, recentGameRows] =
        await Promise.all([
            orFallback(() => db.questionSet.count({ where: { creatorId: teacherId } }), 0),
            orFallback(() => db.classroom.count({ where: { teacherId } }), 0),
            orFallback(() => db.student.count({ where: { classroom: { teacherId } } }), 0),
            orFallback(
                () => db.gameHistory.count({ where: { hostId: teacherId, endedAt: { gte: since } } }),
                0
            ),
            orFallback(
                () =>
                    db.questionSet.findMany({
                        where: { creatorId: teacherId },
                        select: { id: true, title: true, updatedAt: true },
                        orderBy: { updatedAt: "desc" },
                        take: PENDING_ITEMS_PER_SOURCE,
                    }),
                []
            ),
            orFallback(
                () =>
                    db.lesson.findMany({
                        where: { ownerUserId: teacherId, status: "DRAFT" },
                        select: { id: true, title: true, updatedAt: true },
                        orderBy: { updatedAt: "desc" },
                        take: PENDING_ITEMS_PER_SOURCE,
                    }),
                []
            ),
            orFallback(
                () =>
                    db.gameHistory.findMany({
                        where: { hostId: teacherId },
                        select: { id: true, gameMode: true, players: true, endedAt: true },
                        orderBy: { endedAt: "desc" },
                        take: RECENT_GAMES_LIMIT,
                    }),
                []
            ),
        ]);

    const pendingItems: TeacherDashboardPendingItem[] = [
        ...recentSets.map((set) => ({
            id: set.id,
            kind: "questionSet" as const,
            title: set.title,
            href: `/dashboard/edit-set/${set.id}`,
            updatedAt: set.updatedAt.toISOString(),
        })),
        ...lessonDrafts.map((lesson) => ({
            id: lesson.id,
            kind: "lessonDraft" as const,
            title: lesson.title,
            href: `/dashboard/lessons/${lesson.id}`,
            updatedAt: lesson.updatedAt.toISOString(),
        })),
    ]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5);

    const recentGames: TeacherDashboardRecentGame[] = recentGameRows.map((game) => ({
        id: game.id,
        gameMode: game.gameMode,
        playerCount: Array.isArray(game.players) ? game.players.length : 0,
        endedAt: game.endedAt.toISOString(),
    }));

    return {
        questionSetCount,
        classroomCount,
        studentCount,
        gamesThisWeek,
        pendingItems,
        recentGames,
    };
}

async function orFallback<T>(run: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await run();
    } catch {
        return fallback;
    }
}
