
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { Calendar, Clock, Trophy, ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    if (!session?.user) return <div>Unauthorized</div>;

    const game = await db.gameHistory.findUnique({
        where: { id: params.id },
    });

    if (!game) {
        return <div className="p-8 text-center">Report not found</div>;
    }

    if (game.hostId !== session.user.id) {
        return <div className="p-8 text-center">Forbidden</div>;
    }

    const players = (game.players as any[]) || [];

    // Calculate aggregated stats
    let totalCorrect = 0;
    let totalIncorrect = 0;

    players.forEach(p => {
        totalCorrect += (p.correctAnswers || 0);
        totalIncorrect += (p.incorrectAnswers || 0);
    });

    const totalAnswers = totalCorrect + totalIncorrect;
    const classAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    // Calculate Winner
    const sortedPlayers = [...players].sort((a, b) => {
        const scoreA = a.crypto || a.gold || a.score || 0;
        const scoreB = b.crypto || b.gold || b.score || 0;
        return scoreB - scoreA;
    });

    const winner = sortedPlayers[0];
    const durationMinutes = game.startedAt
        ? Math.ceil((new Date(game.endedAt).getTime() - new Date(game.startedAt).getTime()) / 60000)
        : 0;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/reports">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Game Report</h1>
                    <div className="flex items-center gap-4 text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(game.endedAt), "PP p")}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {durationMinutes} mins</span>
                        <span className="uppercase font-bold tracking-wider text-xs bg-slate-100 px-2 py-1 rounded">
                            {game.gameMode.replace(/_/g, " ")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200 col-span-1 md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-700 font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5" /> Top Performer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            {winner?.avatar && (
                                <img src={winner.avatar} alt="Winner" className="w-16 h-16 rounded-full bg-white p-1 border-2 border-amber-300" />
                            )}
                            <div>
                                <div className="text-3xl font-black text-slate-900">{winner?.name || "No players"}</div>
                                <div className="text-amber-600 font-bold">
                                    {winner?.crypto ? `₿ ${winner.crypto.toLocaleString()}` :
                                        winner?.gold ? `${winner.gold.toLocaleString()} Gold` :
                                            `${winner?.score || 0} Points`}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-sm uppercase flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Class Accuracy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-4xl font-bold ${classAccuracy >= 70 ? 'text-green-600' : classAccuracy >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                            {classAccuracy}%
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            {totalCorrect} correct / {totalAnswers} total
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-sm uppercase">Participation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-slate-900">{players.length}</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Students joined
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Leaderboard Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Student Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Rank</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4 text-center">Accuracy</th>
                                    <th className="px-6 py-4 text-center hidden sm:table-cell">Correct</th>
                                    <th className="px-6 py-4 text-center hidden sm:table-cell">Incorrect</th>
                                    <th className="px-6 py-4 text-right">Final Score</th>
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
                                                {/* Avatar placeholder if needed */}
                                                {player.name}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${pAccuracy >= 80 ? 'bg-green-100 text-green-800' :
                                                        pAccuracy >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'}`}>
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
                                                {player.crypto ? `₿ ${player.crypto.toLocaleString()}` :
                                                    player.gold ? player.gold.toLocaleString() :
                                                        (player.score || 0).toLocaleString()}
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
