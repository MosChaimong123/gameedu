
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { Calendar, Clock, Users, ArrowRight, BarChart3, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageBackLink } from "@/components/ui/page-back-link";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { formatTranslation } from "@/lib/format-translation";
import { getRequestLanguage } from "@/lib/request-language";
import { formatGameModeLabel } from "@/lib/game-mode-label";

export const dynamic = "force-dynamic";

type ReportPlayer = {
    correctAnswers?: number;
    incorrectAnswers?: number;
};

export default async function ReportsPage() {
    const session = await auth();
    const lang = await getRequestLanguage();
    const t = (key: string, params?: Record<string, string | number>) => formatTranslation(lang, key, params);
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

    return (
        <div className="mx-auto w-full max-w-6xl space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <PageBackLink href="/dashboard" labelKey="navBackDashboard" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("gameReportsListTitle")}</h1>
                        <p className="text-slate-500 mt-2">{t("gameReportsListSubtitle")}</p>
                    </div>
                </div>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">{t("gameReportsEmptyTitle")}</h3>
                    <p className="text-slate-500 mb-6">{t("gameReportsEmptyDesc")}</p>
                    <Link href="/host">
                        <Button>{t("gameReportsHostGameButton")}</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {history.map((game) => {
                        const players = (game.players as ReportPlayer[]) || [];
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

                        return (
                            <Link key={game.id} href={`/dashboard/reports/${game.id}`}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer group border-slate-200">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div
                                                className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-3xl
                                                ${game.gameMode === "GOLD_QUEST" ? "bg-amber-100 text-amber-600" : game.gameMode === "CRYPTO_HACK" ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-600"}
                                            `}
                                            >
                                                {game.gameMode === "GOLD_QUEST" ? "👑" : game.gameMode === "CRYPTO_HACK" ? "💻" : "🎮"}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 group-hover:text-purple-600 transition-colors">
                                                    {formatGameModeLabel(game.gameMode, t)}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {format(new Date(game.endedAt), "MMM d, yyyy", { locale: dfLocale })}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {format(new Date(game.endedAt), "h:mm a", { locale: dfLocale })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            {accuracy !== null && (
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1 font-bold text-slate-700">
                                                        <TrendingUp
                                                            className={`w-4 h-4 ${accuracy >= 70 ? "text-green-500" : accuracy >= 40 ? "text-amber-500" : "text-red-500"}`}
                                                        />
                                                        {accuracy}%
                                                    </div>
                                                    <span className="text-xs text-slate-400">{t("gameReportClassAccuracy")}</span>
                                                </div>
                                            )}

                                            <div className="flex flex-col items-end min-w-[80px]">
                                                <div className="flex items-center gap-2 font-semibold text-slate-700">
                                                    <Users className="w-4 h-4" />
                                                    {playerCount}
                                                </div>
                                                <span className="text-xs text-slate-400">{t("gameReportsListPlayersLabel")}</span>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-600 transition-colors" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
