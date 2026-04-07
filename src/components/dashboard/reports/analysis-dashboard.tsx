"use client";

import React from "react";
import { format } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
} from "recharts";
import { useLanguage } from "@/components/providers/language-provider";

type PlayerResponses = Record<string, boolean | undefined>;

interface AnalysisPlayer {
    id: string;
    name: string;
    responses?: PlayerResponses;
    correctAnswers?: number;
    incorrectAnswers?: number;
    gold?: number;
    crypto?: number;
    score?: number;
}

interface QuestionItem {
    id: string;
    question: string;
}

interface QuestionSet {
    questions?: unknown;
}

interface HistoryEntry {
    endedAt: string | Date;
    players?: unknown;
}

interface GrowthDatum {
    date: string;
    accuracy: number;
    score: number;
}

interface QuestionAverage {
    id: string;
    text: string;
    avg: number;
}

function isQuestionItem(value: unknown): value is QuestionItem {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        "question" in value &&
        typeof value.id === "string" &&
        typeof value.question === "string"
    );
}

function isAnalysisPlayer(value: unknown): value is AnalysisPlayer {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        "name" in value &&
        typeof value.id === "string" &&
        typeof value.name === "string"
    );
}

interface AnalysisDashboardProps {
    game?: unknown;
    players: AnalysisPlayer[];
    questionSet: QuestionSet | null;
    fullHistory: HistoryEntry[];
}

export function AnalysisDashboard({ game: _game, players, questionSet, fullHistory }: AnalysisDashboardProps) {
    void _game;
    const { t, language } = useLanguage();
    const dfLocale = language === "th" ? thLocale : enUS;

    const [selectedStudent, setSelectedStudent] = React.useState<string | null>(players[0]?.name || null);
    const questions = React.useMemo<QuestionItem[]>(
        () => (Array.isArray(questionSet?.questions) ? questionSet.questions.filter(isQuestionItem) : []),
        [questionSet?.questions]
    );
    const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

    const growthData = React.useMemo<GrowthDatum[]>(() => {
        if (!selectedStudent) return [];

        return fullHistory
            .map((h) => {
                const hPlayers = Array.isArray(h.players) ? h.players.filter(isAnalysisPlayer) : [];
                const p = hPlayers.find((pl) => pl.name === selectedStudent);
                if (!p) return null;

                const correct = p.correctAnswers || 0;
                const total = correct + (p.incorrectAnswers || 0);
                const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

                return {
                    date: format(new Date(h.endedAt), "MMM d, yyyy", { locale: dfLocale }),
                    accuracy,
                    score: p.gold || p.crypto || p.score || 0,
                };
            })
            .filter((entry): entry is GrowthDatum => entry !== null);
    }, [fullHistory, selectedStudent, dfLocale]);

    const questionAverages = React.useMemo<QuestionAverage[]>(() => {
        return questions
            .map((q) => {
                let correct = 0;
                let total = 0;

                players.forEach((p) => {
                    const resp = p.responses?.[q.id];
                    if (resp !== undefined) {
                        total++;
                        if (resp === true) correct++;
                    }
                });

                return {
                    id: q.id,
                    text: q.question,
                    avg: total > 0 ? correct / total : 1,
                };
            })
            .sort((a, b) => a.avg - b.avg);
    }, [players, questions]);

    if (!questionSet) {
        return (
            <Card className="bg-slate-50 border-dashed">
                <CardContent className="py-10 text-center text-slate-500">
                    <p>{t("analysisNoQuestionSet")}</p>
                </CardContent>
            </Card>
        );
    }

    const growthTitleName = selectedStudent ?? t("gameReportTableStudent");

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">{t("analysisPersonalGrowthTitle", { name: growthTitleName })}</CardTitle>
                        <select
                            className="text-xs border rounded px-2 py-1 bg-white"
                            value={selectedStudent || ""}
                            onChange={(e) => setSelectedStudent(e.target.value)}
                        >
                            {sortedPlayers.map((p) => (
                                <option key={p.id} value={p.name}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full pt-4">
                            {growthData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={growthData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                                            domain={[0, 100]}
                                            unit="%"
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: "12px",
                                                border: "none",
                                                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                            }}
                                            formatter={(value: number | string | undefined) => [
                                                `${value ?? 0}%`,
                                                t("analysisChartTooltipAccuracy"),
                                            ]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="accuracy"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }}
                                            activeDot={{ r: 6 }}
                                            animationDuration={1500}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                    {t("analysisNoGrowthData")}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-purple-50/50">
                    <CardHeader>
                        <CardTitle className="text-lg text-purple-900">{t("analysisInsightSummary")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm">
                            <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">
                                {t("analysisTopicStruggler")}
                            </p>
                            {(() => {
                                const stuffer = questionAverages[0];
                                return stuffer && stuffer.avg < 0.6 ? (
                                    <p className="text-sm font-medium text-slate-700 line-clamp-2">
                                        {t("analysisClassStrugglesWithPrefix")}{" "}
                                        <span className="text-red-600">&quot;{stuffer.text}&quot;</span>
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">{t("analysisMasteryDistributed")}</p>
                                );
                            })()}
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm">
                            <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">
                                {t("analysisProjectedGrowth")}
                            </p>
                            <p className="text-sm text-slate-700">{t("analysisProjectedGrowthBody")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="flex items-center justify-between">
                        <span>{t("analysisHeatmapTitle")}</span>
                        <div className="flex items-center gap-4 text-xs font-normal">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                                {t("analysisLegendCorrect")}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-red-500 rounded-sm" />
                                {t("analysisLegendIncorrect")}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-slate-200 rounded-sm" />
                                {t("analysisLegendNoData")}
                            </div>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                    <th className="px-4 py-3 border-r sticky left-0 bg-slate-50 z-10 w-[200px]">
                                        {t("gameReportTableStudent")}
                                    </th>
                                    {questions.map((q, idx: number) => (
                                        <th key={q.id} className="p-2 border-r text-center min-w-[40px]">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help">
                                                            {t("analysisQuestionShort", { num: idx + 1 })}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[300px]">
                                                        <p className="font-bold mb-1">
                                                            {t("analysisTooltipQuestion", { num: idx + 1 })}
                                                        </p>
                                                        <p className="text-xs line-clamp-3">{q.question}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center">{t("analysisHeatmapMastery")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedPlayers.map((player) => {
                                    const responses = player.responses || {};
                                    const pCorrect = player.correctAnswers || 0;
                                    const pIncorrect = player.incorrectAnswers || 0;
                                    const pTotal = pCorrect + pIncorrect;
                                    const pAccuracy = pTotal > 0 ? Math.round((pCorrect / pTotal) * 100) : 0;

                                    return (
                                        <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 border-r font-semibold text-slate-700 sticky left-0 bg-white z-10">
                                                {player.name}
                                            </td>
                                            {questions.map((q) => {
                                                const isCorrect = responses[q.id];
                                                const hasData = isCorrect !== undefined;

                                                return (
                                                    <td key={q.id} className="p-1 border-r text-center h-[50px]">
                                                        <div
                                                            className={`w-full h-full rounded transition-all duration-300 flex items-center justify-center
                                                            ${!hasData ? "bg-slate-100" : isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"}
                                                        `}
                                                        >
                                                            {!hasData ? (
                                                                <Minus className="w-3 h-3 text-slate-300" />
                                                            ) : isCorrect ? (
                                                                <Check className="w-4 h-4" />
                                                            ) : (
                                                                <X className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-center font-bold">
                                                <span
                                                    className={`${pAccuracy >= 75 ? "text-green-600" : pAccuracy >= 50 ? "text-amber-600" : "text-red-500"}`}
                                                >
                                                    {pAccuracy}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                <tr>
                                    <td className="px-4 py-4 border-r sticky left-0 bg-slate-50 z-10">
                                        {t("analysisTopicAverage")}
                                    </td>
                                    {questions.map((q) => {
                                        let correct = 0;
                                        let total = 0;
                                        sortedPlayers.forEach((p) => {
                                            const resp = p.responses?.[q.id];
                                            if (resp !== undefined) {
                                                total++;
                                                if (resp === true) correct++;
                                            }
                                        });
                                        const avg = total > 0 ? Math.round((correct / total) * 100) : 0;
                                        return (
                                            <td key={q.id} className="p-2 border-r text-center">
                                                <div
                                                    className={`text-xs ${avg >= 70 ? "text-green-600" : avg >= 40 ? "text-amber-600" : "text-red-600"}`}
                                                >
                                                    {avg}%
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-4 text-center text-slate-700">{t("analysisClassAverage")}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
