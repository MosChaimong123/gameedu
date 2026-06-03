"use client";

import { AssignmentCommandCenter } from "@/components/dashboard/assignment-command-center";
import { TeacherCommandCenter } from "@/components/dashboard/teacher-command-center";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, BarChart3, Calendar, Clock, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export type ReportsGameCard = {
    id: string;
    gameModeLabel: string;
    dateLabel: string;
    timeLabel: string;
    playerCount: number;
    accuracy: number | null;
    icon: string;
    toneClassName: string;
};

type ReportsTabsProps = {
    gameCards: ReportsGameCard[];
    tabLabels: {
        teacher: string;
        assignments: string;
        games: string;
    };
    gameLabels: {
        emptyTitle: string;
        emptyDesc: string;
        hostButton: string;
        accuracy: string;
        players: string;
    };
    assignmentLabels: {
        title: string;
        subtitle: string;
        primaryButton: string;
        secondaryButton: string;
    };
};

export function ReportsTabs({ gameCards, tabLabels, gameLabels, assignmentLabels }: ReportsTabsProps) {
    return (
        <Tabs defaultValue="teacher" className="space-y-6">
            <TabsList className="h-auto w-full justify-start rounded-2xl bg-white/90 p-1.5 shadow-sm">
                <TabsTrigger value="teacher" className="rounded-xl px-4 py-2.5 font-semibold">
                    {tabLabels.teacher}
                </TabsTrigger>
                <TabsTrigger value="assignments" className="rounded-xl px-4 py-2.5 font-semibold">
                    {tabLabels.assignments}
                </TabsTrigger>
                <TabsTrigger value="games" className="rounded-xl px-4 py-2.5 font-semibold">
                    {tabLabels.games}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="teacher" className="space-y-6">
                <TeacherCommandCenter />
            </TabsContent>

            <TabsContent value="assignments" className="space-y-6">
                <Card className="border-indigo-100 bg-indigo-50/70 shadow-sm">
                    <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                        <div className="max-w-2xl">
                            <h2 className="text-lg font-black text-indigo-950">{assignmentLabels.title}</h2>
                            <p className="mt-1 text-sm text-indigo-800">{assignmentLabels.subtitle}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild className="h-9 rounded-full">
                                <Link href="/dashboard/classrooms">
                                    {assignmentLabels.primaryButton}
                                    <ArrowRight className="ml-1.5 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-9 rounded-full border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50">
                                <Link href="/dashboard/classrooms">
                                    {assignmentLabels.secondaryButton}
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <AssignmentCommandCenter />
            </TabsContent>

            <TabsContent value="games" className="space-y-6">
                {gameCards.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-20 text-center">
                        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                        <h3 className="text-lg font-semibold text-slate-700">{gameLabels.emptyTitle}</h3>
                        <p className="mb-6 text-slate-500">{gameLabels.emptyDesc}</p>
                        <Link href="/host">
                            <Button>{gameLabels.hostButton}</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {gameCards.map((game) => (
                            <Link key={game.id} href={`/dashboard/reports/${game.id}`}>
                                <Card className="group cursor-pointer border-slate-200 transition-shadow hover:shadow-md">
                                    <CardContent className="flex items-center justify-between p-6">
                                        <div className="flex items-center gap-6">
                                            <div
                                                className={`flex h-14 w-14 items-center justify-center rounded-xl text-3xl font-bold ${game.toneClassName}`}
                                            >
                                                {game.icon}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-purple-600">
                                                    {game.gameModeLabel}
                                                </h3>
                                                <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {game.dateLabel}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {game.timeLabel}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            {game.accuracy !== null ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1 font-bold text-slate-700">
                                                        <TrendingUp
                                                            className={`h-4 w-4 ${
                                                                game.accuracy >= 70
                                                                    ? "text-green-500"
                                                                    : game.accuracy >= 40
                                                                      ? "text-amber-500"
                                                                      : "text-red-500"
                                                            }`}
                                                        />
                                                        {game.accuracy}%
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        {gameLabels.accuracy}
                                                    </span>
                                                </div>
                                            ) : null}

                                            <div className="min-w-[80px] flex-col items-end">
                                                <div className="flex items-center gap-2 font-semibold text-slate-700">
                                                    <Users className="h-4 w-4" />
                                                    {game.playerCount}
                                                </div>
                                                <span className="text-xs text-slate-400">{gameLabels.players}</span>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-purple-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
