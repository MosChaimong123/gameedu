import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowLeft, Clock, Coins, Trophy, Users } from "lucide-react"

export default async function HistoryDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth()
    if (!session?.user?.id) return <div>Unauthorized</div>

    const game = await prisma.gameHistory.findUnique({
        where: { id: params.id },
    })

    if (!game || game.hostId !== session.user.id) {
        return <div className="p-8">Report not found.</div>
    }

    const players = (game.players as any[]) || []

    // Calculate display score (Fallback to gold for Gold Quest)
    const processedPlayers = players.map(p => ({
        ...p,
        displayScore: p.score || p.gold || 0
    }))

    const sortedPlayers = [...processedPlayers].sort((a, b) => b.displayScore - a.displayScore)
    const winner = sortedPlayers[0]

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <Link href="/dashboard/history" className="inline-flex items-center text-slate-500 hover:text-purple-600 font-bold mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to History
            </Link>

            {/* Header / Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {/* Main Info */}
                <div className="md:col-span-2 bg-purple-600 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Trophy className="w-40 h-40" />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-sm font-bold opacity-80 uppercase tracking-wider mb-1">Game Report</h2>
                        <h1 className="text-3xl font-black mb-4">{game.gameMode.replace("_", " ")}</h1>
                        <p className="font-medium opacity-90 flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {format(new Date(game.endedAt), "PPP 'at' p")}
                        </p>
                    </div>
                </div>

                {/* Stat 1: Players */}
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center items-center">
                    <Users className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-3xl font-black text-slate-800">{players.length}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Players</span>
                </div>

                {/* Stat 2: Winner */}
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center items-center">
                    <Trophy className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-xl font-black text-slate-800 truncate max-w-full px-2">
                        {winner?.name || "-"}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Winner</span>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-700">Leaderboard</h3>
                    <div className="text-sm text-slate-500 font-medium">Sorted by Score</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b">
                                <th className="px-6 py-3 font-bold text-slate-500 text-sm uppercase tracking-wider w-16">Rank</th>
                                <th className="px-6 py-3 font-bold text-slate-500 text-sm uppercase tracking-wider">Player</th>
                                <th className="px-6 py-3 font-bold text-slate-500 text-sm uppercase tracking-wider text-right">Score/Gold</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedPlayers.map((player, index) => (
                                <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                                    <td className="px-6 py-4 font-black text-slate-400 text-lg">
                                        #{index + 1}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            {/* Avatar placeholder */}
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 mr-3 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                {player.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-700">{player.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">
                                            <Coins className="w-4 h-4 mr-1.5" />
                                            {player.displayScore.toLocaleString()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {players.length === 0 && (
                    <div className="p-12 text-center text-slate-400 italic">
                        No player data recorded.
                    </div>
                )}
            </div>
        </div>
    )
}
