
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { Calendar, Clock, Trophy, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    if (!session?.user) return <div>Unauthorized</div>;

    const game = await db.gameHistory.findUnique({
        where: { id: params.id },
    });

    if (!game) {
        return <div className="p-8 text-center">Game not found</div>;
    }

    if (game.hostId !== session.user.id) {
        return <div className="p-8 text-center">Forbidden</div>;
    }

    const players = (game.players as any[]) || [];

    // Calculate Winner
    const sortedPlayers = [...players].sort((a, b) => {
        const scoreA = a.crypto || a.gold || 0;
        const scoreB = b.crypto || b.gold || 0;
        return scoreB - scoreA;
    });

    const winner = sortedPlayers[0];
    const durationMinutes = game.startedAt
        ? Math.ceil((new Date(game.endedAt).getTime() - new Date(game.startedAt).getTime()) / 60000)
        : 0;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/history">
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
                            {game.gameMode.replace("_", " ")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-700 font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5" /> Winner
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{winner?.name || "No Winner"}</div>
                        <div className="text-amber-600 font-bold">
                            {winner?.crypto ? `₿ ${winner.crypto.toLocaleString()}` :
                                winner?.gold ? `${winner.gold.toLocaleString()} Gold` : "0 pts"}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-sm uppercase">Total Players</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-slate-900">{players.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-sm uppercase">Win Condition</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-slate-900">
                            {(game.settings as any)?.winCondition || "Default"}
                        </div>
                        <div className="text-sm text-slate-500">
                            Goal: {(game.settings as any)?.goldGoal || (game.settings as any)?.cryptoGoal || (game.settings as any)?.timeLimitMinutes + " mins" || "-"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Leaderboard Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Final Standings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Rank</th>
                                    <th className="px-6 py-4">Player</th>
                                    <th className="px-6 py-4 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedPlayers.map((player, index) => (
                                    <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-mono text-slate-400">#{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{player.name}</td>
                                        <td className="px-6 py-4 text-right font-bold text-purple-600">
                                            {player.crypto ? `₿ ${player.crypto.toLocaleString()}` :
                                                player.gold ? player.gold.toLocaleString() : 0}
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
