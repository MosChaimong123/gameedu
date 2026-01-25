"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, BookOpen, Clock, Loader2, MoreVertical } from "lucide-react"

type QuestionSet = {
    id: string
    title: string
    description: string | null
    createdAt: string
    updatedAt: string
    questions: { id: string }[]
}

import { useLanguage } from "@/components/providers/language-provider"

export default function MySetsPage() {
    const [sets, setSets] = useState<QuestionSet[]>([])
    const [loading, setLoading] = useState(true)
    const { t } = useLanguage()

    useEffect(() => {
        async function fetchSets() {
            try {
                const response = await fetch("/api/sets")
                if (response.ok) {
                    const data = await response.json()
                    setSets(data)
                }
            } catch (error) {
                console.error("Failed to fetch sets", error)
            } finally {
                setLoading(false)
            }
        }

        fetchSets()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("mySets")}</h1>
                    <p className="text-slate-500">{t("manageSetsDesc")}</p>
                </div>
                <Link href="/dashboard/create-set">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="mr-2 h-4 w-4" />
                        {t("createSet")}
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
            ) : sets.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{t("noSetsTitle")}</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                        {t("noSetsDesc")}
                    </p>
                    <Link href="/dashboard/create-set">
                        <Button>{t("createFirstSet")}</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sets.map((set) => (
                        <Card key={set.id} className="group relative overflow-hidden transition-all hover:shadow-md">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="line-clamp-1 text-lg">{set.title}</CardTitle>
                                    <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardDescription className="line-clamp-2 min-h-[2.5em]">
                                    {set.description || t("noDescription")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Cover image could go here */}
                                <div className="flex items-center text-xs text-slate-500 space-x-4">
                                    <div className="flex items-center">
                                        <BookOpen className="mr-1 h-3 w-3" />
                                        {set.questions.length} {t("questionsCount")}
                                    </div>
                                    <div className="flex items-center">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {new Date(set.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <div className="flex w-full space-x-2">
                                    <Link href={`/host/${set.id}`} className="flex-1">
                                        <Button className="w-full bg-purple-100 text-purple-700 hover:bg-purple-200" size="sm">
                                            {t("host")}
                                        </Button>
                                    </Link>
                                    <Link href={`/dashboard/edit-set/${set.id}`} className="flex-1">
                                        <Button variant="outline" className="w-full" size="sm">
                                            {t("edit")}
                                        </Button>
                                    </Link>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
