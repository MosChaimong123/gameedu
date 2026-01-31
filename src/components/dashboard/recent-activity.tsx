"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, BookOpen, ChevronRight, PenSquare, Play } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/providers/language-provider"

type RecentSet = {
    id: string
    title: string
    questionsCount: number
    updatedAt: string
    coverImage: string | null
}

export function RecentActivity() {
    const { t } = useLanguage()
    const [recentSets, setRecentSets] = useState<RecentSet[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Mocking fetch for now, or implement real fetch if API supports sorting
        async function fetchRecent() {
            try {
                // In a real app we would have an endpoint like /api/sets/recent or /api/sets?sort=updatedAt
                // For now, let's just fetch all and slice the top 3
                const res = await fetch("/api/sets")
                if (res.ok) {
                    const data = await res.json()
                    // Sort by updatedAt desc
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sorted = data.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

                    setRecentSets(sorted.slice(0, 3).map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        questionsCount: s.questions.length,
                        updatedAt: s.updatedAt,
                        coverImage: s.coverImage
                    })))
                }
            } catch (error) {
                console.error("Failed to fetch recent sets", error)
            } finally {
                setLoading(false)
            }
        }
        fetchRecent()
    }, [])

    if (loading) return <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />

    if (recentSets.length === 0) {
        return (
            <Card className="border-dashed border-2 bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="bg-slate-100 p-3 rounded-full mb-3">
                        <BookOpen className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">No recent activity</p>
                    <Link href="/create-set" className="text-sm font-bold text-purple-600 hover:underline mt-1">
                        Create your first set
                    </Link>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-800">Recently Updated</CardTitle>
                <Link href="/dashboard/my-sets" className="text-sm font-bold text-purple-600 flex items-center hover:underline">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </CardHeader>
            <CardContent className="px-0 space-y-3">
                {recentSets.map((set) => (
                    <div key={set.id} className="group flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-purple-200">
                        {/* Thumbnail */}
                        <div className="h-16 w-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden relative">
                            {set.coverImage ? (
                                <img src={set.coverImage} alt={set.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 truncate group-hover:text-purple-700 transition-colors">
                                {set.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
                                <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" /> {set.questionsCount} Qs
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {new Date(set.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Quick Actions for Item */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/edit-set/${set.id}`}>
                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-purple-600 transition-colors" title="Edit">
                                    <PenSquare className="w-4 h-4" />
                                </button>
                            </Link>
                            <Link href={`/host/${set.id}`}>
                                <button className="p-2 hover:bg-orange-50 rounded-lg text-slate-500 hover:text-orange-600 transition-colors" title="Host">
                                    <Play className="w-4 h-4" />
                                </button>
                            </Link>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
