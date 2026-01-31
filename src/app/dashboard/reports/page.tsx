
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { Calendar, Clock, Trophy, Users, ArrowRight, BarChart3, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const session = await auth();
    if (!session?.user) return <div>Unauthorized</div>;

    const history = await db.gameHistory.findMany({
        where: { hostId: session.user.id },
        orderBy: { endedAt: "desc" }
    });

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
                    <p className="text-slate-500 mt-2">Analyze student performance and game history.</p>
                </div>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No reports available</h3>
                    <p className="text-slate-500 mb-6">Host a game to see performance analytics here.</p>
                    <Link href="/host">
                        <Button>Host a Game</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {history.map((game) => {
                        const players = (game.players as any[]) || [];
                        const playerCount = players.length;

                        // Calculate average score or accuracy if available
                        // Since new fields might be missing in old data, handle safely
                        let totalCorrect = 0;
                        let totalQuestions = 0;

                        players.forEach(p => {
                            if (p.correctAnswers !== undefined) {
                                totalCorrect += p.correctAnswers;
                                totalQuestions += (p.correctAnswers + (p.incorrectAnswers || 0));
                            }
                        });

                        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

                        return (
                            <Link key={game.id} href={`/dashboard/reports/${game.id}`}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer group border-slate-200">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-3xl
                                                ${game.gameMode === 'GOLD_QUEST' ? 'bg-amber-100 text-amber-600' :
                                                    game.gameMode === 'CRYPTO_HACK' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}
                                            `}>
                                                {game.gameMode === 'GOLD_QUEST' ? '👑' :
                                                    game.gameMode === 'CRYPTO_HACK' ? '💻' : '🎮'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 group-hover:text-purple-600 transition-colors">
                                                    {game.gameMode.replace(/_/g, " ")}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {format(new Date(game.endedAt), "MMM d, yyyy")}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {format(new Date(game.endedAt), "h:mm a")}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            {accuracy !== null && (
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1 font-bold text-slate-700">
                                                        <TrendingUp className={`w-4 h-4 ${accuracy >= 70 ? 'text-green-500' : accuracy >= 40 ? 'text-amber-500' : 'text-red-500'}`} />
                                                        {accuracy}%
                                                    </div>
                                                    <span className="text-xs text-slate-400">Class Accuracy</span>
                                                </div>
                                            )}

                                            <div className="flex flex-col items-end min-w-[80px]">
                                                <div className="flex items-center gap-2 font-semibold text-slate-700">
                                                    <Users className="w-4 h-4" />
                                                    {playerCount}
                                                </div>
                                                <span className="text-xs text-slate-400">Players</span>
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
