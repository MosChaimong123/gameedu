
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { Calendar, Clock, Trophy } from "lucide-react";
import { PageBackLink } from "@/components/ui/page-back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { formatTranslation } from "@/lib/format-translation";
import { getRequestLanguage } from "@/lib/request-language";
import { formatGameModeLabel } from "@/lib/game-mode-label";
export const dynamic = "force-dynamic";

type HistoryPlayer = {
    name: string;
    gold?: number;
    crypto?: number;
};

type HistorySettings = {
    winCondition?: string;
    goldGoal?: number;
    cryptoGoal?: number;
    timeLimitMinutes?: number;
};

export default async function HistoryDetailPage(props: { params: Promise<{ id: string }> }) {
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
            gameMode: true,
            endedAt: true,
            startedAt: true,
            players: true,
            settings: true,
        },
    });

    if (!game) {
        return <div className="p-8 text-center">{t("gameReportGameNotFound")}</div>;
    }

    if (game.hostId !== session.user.id) {
        return <div className="p-8 text-center">{t("gameReportForbidden")}</div>;
    }

    const players = (game.players as HistoryPlayer[]) || [];
    const settings = (game.settings as HistorySettings | null) || {};

    const sortedPlayers = [...players].sort((a, b) => {
        const scoreA = a.crypto || a.gold || 0;
        const scoreB = b.crypto || b.gold || 0;
        return scoreB - scoreA;
    });

    const winner = sortedPlayers[0];
    const durationMinutes = game.startedAt
        ? Math.ceil((new Date(game.endedAt).getTime() - new Date(game.startedAt).getTime()) / 60000)
        : 0;

    const winnerName = winner?.name?.trim() ? winner.name : t("gameReportNoWinner");
    const winConditionLabel = settings.winCondition?.trim()
        ? settings.winCondition
        : t("gameReportWinConditionDefault");

    const goalDetail =
        settings.goldGoal != null
            ? String(settings.goldGoal)
            : settings.cryptoGoal != null
              ? String(settings.cryptoGoal)
              : settings.timeLimitMinutes != null
                ? t("gameReportDurationMins", { mins: settings.timeLimitMinutes })
                : "-";

    const winnerSubline = winner?.crypto
        ? `₿ ${winner.crypto.toLocaleString()}`
        : winner?.gold
          ? `${winner.gold.toLocaleString()} ${t("gameReportGold")}`
          : t("gameReportZeroPoints");

    return (
        <div className="mx-auto w-full max-w-6xl space-y-8">
            <div className="flex flex-wrap items-center gap-4">
                <PageBackLink href="/dashboard/history" labelKey="navBackGameHistory" />
                <div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-700 font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5" /> {t("gameReportWinner")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{winnerName}</div>
                        <div className="text-amber-600 font-bold">{winnerSubline}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-sm uppercase">
                            {t("gameReportTotalPlayers")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-slate-900">{players.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-sm uppercase">
                            {t("gameReportWinCondition")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-slate-900">{winConditionLabel}</div>
                        <div className="text-sm text-slate-500">
                            {t("gameReportGoalPrefix")}{" "}
                            {goalDetail}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("gameReportFinalStandings")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">{t("gameReportRank")}</th>
                                    <th className="px-6 py-4">{t("gameReportPlayerColumn")}</th>
                                    <th className="px-6 py-4 text-right">{t("gameReportScore")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedPlayers.map((player, index) => (
                                    <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-mono text-slate-400">#{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{player.name}</td>
                                        <td className="px-6 py-4 text-right font-bold text-purple-600">
                                            {player.crypto
                                                ? `₿ ${player.crypto.toLocaleString()}`
                                                : player.gold
                                                  ? player.gold.toLocaleString()
                                                  : 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
