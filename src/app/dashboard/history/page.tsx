import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"
import { format } from "date-fns" // Assuming date-fns is installed, or use native Intl
import Link from "next/link"
import { BarChart, Calendar, ChevronRight, Hash, Users } from "lucide-react"

export default async function HistoryPage() {
    const session = await auth()
    if (!session?.user?.id) return <div>Unauthorized</div>

    const history = await prisma.gameHistory.findMany({
        where: { hostId: session.user.id },
        orderBy: { endedAt: "desc" },
    })

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-extrabold text-slate-800 mb-8 flex items-center">
                <BarChart className="w-8 h-8 mr-3 text-purple-600" />
                History & Reports
            </h1>

            {history.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Reports Yet</h3>
                    <p className="text-slate-500">Host a game to see results here!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {history.map((game) => (
                        <Link
                            key={game.id}
                            href={`/dashboard/history/${game.id}`}
                            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-purple-50 rounded-lg text-purple-600">
                                    <span className="text-xs font-bold uppercase">{game.gameMode.replace("_", " ")}</span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-slate-800">
                                            {format(new Date(game.endedAt), "PPP p")}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold ring-1 ring-green-600/20">
                                            Finished
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                                        <span className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1.5 opacity-70" />
                                            {format(new Date(game.startedAt), "p")}
                                        </span>
                                        <span className="flex items-center">
                                            <Users className="w-4 h-4 mr-1.5 opacity-70" />
                                            {(game.players as any[])?.length || 0} Players
                                        </span>
                                        {game.pin && (
                                            <span className="flex items-center font-mono bg-slate-100 px-1.5 rounded">
                                                <Hash className="w-3 h-3 mr-1 opacity-50" />
                                                {game.pin}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-purple-600 transition-colors" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
