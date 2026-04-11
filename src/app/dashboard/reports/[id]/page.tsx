
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { Calendar, Clock, Trophy, BarChart3 } from "lucide-react";
import { PageBackLink } from "@/components/ui/page-back-link";
import { ReportPrintButton } from "@/components/dashboard/reports/report-print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisDashboard } from "@/components/dashboard/reports/analysis-dashboard";
import Image from "next/image";
import { redirect } from "next/navigation";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { formatTranslation } from "@/lib/format-translation";
import { getRequestLanguage } from "@/lib/request-language";
import { formatGameModeLabel } from "@/lib/game-mode-label";

export const dynamic = "force-dynamic";

type ReportPlayer = {
    id?: string;
    name?: string;
    avatar?: string;
    gold?: number;
    crypto?: number;
    score?: number;
    correctAnswers?: number;
    incorrectAnswers?: number;
};

export default async function ReportDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    const lang = await getRequestLanguage();
    const t = (key: string, p?: Record<string, string | number>) => formatTranslation(lang, key, p);
    const dfLocale = lang === "th" ? thLocale : enUS;
    if (!session?.user) return <div>{t("commonUnauthorized")}</div>;
    if (!isTeacherOrAdmin(session.user.role)) redirect("/dashboard");

    const game = await db.gameHistory.findUnique({
        where: { id: params.id },
        select: {
            id: true,
            hostId: true,
            setId: true,
            gameMode: true,
            startedAt: true,
            endedAt: true,
            players: true,
        },
    });

    if (!game) {
        return <div className="p-8 text-center">{t("gameReportReportNotFound")}</div>;
    }

    if (game.hostId !== session.user.id) {
        return <div className="p-8 text-center">{t("gameReportForbidden")}</div>;
    }

    const questionSet = game.setId
        ? await db.questionSet.findUnique({
              where: { id: game.setId },
              select: {
                  questions: true,
              },
          })
        : null;

    const fullHistory = await db.gameHistory.findMany({
        where: { hostId: session.user.id },
        orderBy: { endedAt: "asc" },
        select: {
            endedAt: true,
            players: true,
        },
    });

    const players = (game.players as ReportPlayer[]) || [];
    const analysisPlayers = players
        .filter((player): player is ReportPlayer & { id: string; name: string } => typeof player.id === "string" && typeof player.name === "string")
        .map((player) => ({
            ...player,
            id: player.id,
            name: player.name,
        }));

    let totalCorrect = 0;
    let totalIncorrect = 0;

    players.forEach((p) => {
        totalCorrect += p.correctAnswers || 0;
        totalIncorrect += p.incorrectAnswers || 0;
    });

    const totalAnswers = totalCorrect + totalIncorrect;
    const classAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    const sortedPlayers = [...players].sort((a, b) => {
        const scoreA = a.crypto || a.gold || a.score || 0;
        const scoreB = b.crypto || b.gold || b.score || 0;
        return scoreB - scoreA;
    });

    const winner = sortedPlayers[0];
    const durationMinutes = game.startedAt
        ? Math.ceil((new Date(game.endedAt).getTime() - new Date(game.startedAt).getTime()) / 60000)
        : 0;

    const topName = winner?.name?.trim() ? winner.name : t("gameReportNoPlayers");
    const topSubline = winner?.crypto
        ? `₿ ${winner.crypto.toLocaleString()}`
        : winner?.gold
          ? `${winner.gold.toLocaleString()} ${t("gameReportGold")}`
          : `${winner?.score || 0} ${t("gameReportPointsLabel")}`;

    return (
        <div className="mx-auto w-full max-w-6xl space-y-8 print:p-0 print:m-0 print:max-w-none">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print, button, nav, aside { display: none !important; }
                    .print-break-inside-avoid { break-inside: avoid; }
                    body { background: white !important; }
                    .card { border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
                }
            `}} />
            <div className="flex flex-wrap items-center gap-4 no-print">
                <PageBackLink href="/dashboard/reports" labelKey="navBackAllReports" className="shrink-0" />
                <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("gameReportTitle")}</h1>
                    <div className="flex items-center gap-4 text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />{" "}
                            {format(new Date(game.endedAt), "PP p", { locale: dfLocale })}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {t("gameReportDurationMins", { mins: durationMinutes })}
                        </span>
                        <span className="uppercase font-bold tracking-wider text-xs bg-slate-100 px-2 py-1 rounded">
                            {formatGameModeLabel(game.gameMode, t)}
                        </span>
                    </div>
                </div>
                <ReportPrintButton className="ml-auto shrink-0 gap-2 border-purple-200 text-purple-700 hover:bg-purple-50" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200 col-span-1 md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-700 font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5" /> {t("gameReportTopPerformer")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            {winner?.avatar && (
                                <Image
                                    src={winner.avatar}
                                    alt={t("gameReportWinnerAlt")}
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="w-16 h-16 rounded-full bg-white p-1 border-2 border-amber-300"
                                />
                            )}
                            <div>
                                <div className="text-3xl font-black text-slate-900">{topName}</div>
                                <div className="text-amber-600 font-bold">{topSubline}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-sm uppercase flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> {t("gameReportClassAccuracy")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-4xl font-bold ${classAccuracy >= 70 ? "text-green-600" : classAccuracy >= 40 ? "text-amber-600" : "text-red-600"}`}
                        >
                            {classAccuracy}%
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            {t("gameReportCorrectSlashTotal", { correct: totalCorrect, total: totalAnswers })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-sm uppercase">
                            {t("gameReportParticipation")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-slate-900">{players.length}</div>
                        <div className="text-xs text-slate-400 mt-1">{t("gameReportStudentsJoined")}</div>
                    </CardContent>
                </Card>
            </div>

            <AnalysisDashboard
                game={game}
                players={analysisPlayers}
                questionSet={questionSet}
                fullHistory={fullHistory}
            />

            <Card>
                <CardHeader>
                    <CardTitle>{t("gameReportStudentPerformance")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">{t("gameReportRank")}</th>
                                    <th className="px-6 py-4">{t("gameReportTableStudent")}</th>
                                    <th className="px-6 py-4 text-center">{t("gameReportTableAccuracy")}</th>
                                    <th className="px-6 py-4 text-center hidden sm:table-cell">
                                        {t("gameReportTableCorrect")}
                                    </th>
                                    <th className="px-6 py-4 text-center hidden sm:table-cell">
                                        {t("gameReportTableIncorrect")}
                                    </th>
                                    <th className="px-6 py-4 text-right">{t("gameReportTableFinalScore")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedPlayers.map((player, index) => {
                                    const pCorrect = player.correctAnswers || 0;
                                    const pIncorrect = player.incorrectAnswers || 0;
                                    const pTotal = pCorrect + pIncorrect;
                                    const pAccuracy = pTotal > 0 ? Math.round((pCorrect / pTotal) * 100) : 0;

                                    return (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-400">#{index + 1}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                                                {player.name}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${pAccuracy >= 80 ? "bg-green-100 text-green-800" : pAccuracy >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                                                >
                                                    {pAccuracy}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center hidden sm:table-cell text-green-600 font-medium">
                                                {pCorrect}
                                            </td>
                                            <td className="px-6 py-4 text-center hidden sm:table-cell text-red-400 font-medium">
                                                {pIncorrect}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-purple-600">
                                                {player.crypto
                                                    ? `₿ ${player.crypto.toLocaleString()}`
                                                    : player.gold
                                                      ? player.gold.toLocaleString()
                                                      : (player.score || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
