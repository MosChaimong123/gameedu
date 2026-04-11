import { auth } from "@/auth";
import { ReportsTabs } from "@/components/dashboard/reports/reports-tabs";
import { PageBackLink } from "@/components/ui/page-back-link";
import { db } from "@/lib/db";
import { formatTranslation } from "@/lib/format-translation";
import { formatGameModeLabel } from "@/lib/game-mode-label";
import { getRequestLanguage } from "@/lib/request-language";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { format } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const session = await auth();
    const lang = await getRequestLanguage();
    const t = (key: string, params?: Record<string, string | number>) =>
        formatTranslation(lang, key, params);
    const dfLocale = lang === "th" ? thLocale : enUS;

    if (!session?.user) return <div>{t("commonUnauthorized")}</div>;
    if (!isTeacherOrAdmin(session.user.role)) redirect("/dashboard");

    const history = await db.gameHistory.findMany({
        where: { hostId: session.user.id },
        orderBy: { endedAt: "desc" },
        select: {
            id: true,
            gameMode: true,
            endedAt: true,
            players: true,
        },
    });

    const gameCards = history.map((game) => {
        const players = (game.players as Array<{ correctAnswers?: number; incorrectAnswers?: number }>) || [];
        const playerCount = players.length;

        let totalCorrect = 0;
        let totalQuestions = 0;

        players.forEach((p) => {
            if (p.correctAnswers !== undefined) {
                totalCorrect += p.correctAnswers;
                totalQuestions += p.correctAnswers + (p.incorrectAnswers || 0);
            }
        });

        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

        return {
            id: game.id,
            gameModeLabel: formatGameModeLabel(game.gameMode, t),
            dateLabel: format(new Date(game.endedAt), "MMM d, yyyy", { locale: dfLocale }),
            timeLabel: format(new Date(game.endedAt), "h:mm a", { locale: dfLocale }),
            playerCount,
            accuracy,
            icon:
                game.gameMode === "GOLD_QUEST"
                    ? "💰"
                    : game.gameMode === "CRYPTO_HACK"
                      ? "💻"
                      : "🎮",
            toneClassName:
                game.gameMode === "GOLD_QUEST"
                    ? "bg-amber-100 text-amber-600"
                    : game.gameMode === "CRYPTO_HACK"
                      ? "bg-green-100 text-green-600"
                      : "bg-slate-100 text-slate-600",
        };
    });

    return (
        <div className="mx-auto w-full max-w-6xl space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <PageBackLink href="/dashboard" labelKey="navBackDashboard" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            {t("gameReportsListTitle")}
                        </h1>
                        <p className="mt-2 text-slate-500">{t("gameReportsListSubtitle")}</p>
                    </div>
                </div>
            </div>

            <ReportsTabs
                gameCards={gameCards}
                tabLabels={{
                    teacher: "ศูนย์บัญชาการครู",
                    assignments: "งานมอบหมาย",
                    games: "รายงานเกม",
                }}
                gameLabels={{
                    emptyTitle: t("gameReportsEmptyTitle"),
                    emptyDesc: t("gameReportsEmptyDesc"),
                    hostButton: t("gameReportsHostGameButton"),
                    accuracy: t("gameReportClassAccuracy"),
                    players: t("gameReportsListPlayersLabel"),
                }}
            />
        </div>
    );
}
