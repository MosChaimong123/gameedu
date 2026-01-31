"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, BookOpen, Clock, Loader2, MoreVertical, Search, Trash2, ArrowLeft, Image as ImageIcon } from "lucide-react"

type QuestionSet = {
    id: string
    title: string
    description: string | null
    isPublic: boolean
    coverImage: string | null
    createdAt: string
    updatedAt: string
    questions: { id: string }[]
}

import { useLanguage } from "@/components/providers/language-provider"

export default function MySetsPage() {
    const [sets, setSets] = useState<QuestionSet[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [setToDelete, setSetToDelete] = useState<string | null>(null)
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

    const handleDeleteSet = async () => {
        if (!setToDelete) return

        try {
            const response = await fetch(`/api/sets/${setToDelete}`, {
                method: "DELETE",
            })

            if (response.ok) {
                setSets(sets.filter((s) => s.id !== setToDelete))
            }
        } catch (error) {
            console.error("Failed to delete set", error)
        } finally {
            setSetToDelete(null)
        }
    }

    const filteredSets = sets.filter((set) =>
        set.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200">
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("mySets")}</h1>
                        <p className="text-slate-500">{t("manageSetsDesc")}</p>
                    </div>
                </div>
                <Link href="/dashboard/create-set">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="mr-2 h-4 w-4" />
                        {t("createSet")}
                    </Button>
                </Link>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    placeholder={t("searchSetsPlaceholder") || "Search your sets..."}
                    className="pl-10 max-w-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
            ) : filteredSets.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{searchQuery ? t("noSearchResults") : t("noSetsTitle")}</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                        {searchQuery ? t("tryDifferentSearch") : t("noSetsDesc")}
                    </p>
                    {!searchQuery && (
                        <Link href="/dashboard/create-set">
                            <Button>{t("createFirstSet")}</Button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSets.map((set) => (
                        <Card key={set.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col border-slate-200">
                            <div className="relative w-full aspect-video bg-slate-100 group-hover:bg-slate-200 transition-colors overflow-hidden">
                                {set.coverImage ? (
                                    <img
                                        src={set.coverImage}
                                        alt={set.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            <CardHeader className="p-4 pb-2 flex-grow space-y-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="line-clamp-1 text-xl font-bold text-slate-800" title={set.title}>{set.title}</CardTitle>
                                </div>
                                <CardDescription className="line-clamp-2 min-h-[2.5em] text-slate-500 text-sm leading-relaxed">
                                    {set.description || <span className="italic text-slate-400">{t("noDescription")}</span>}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-4 pt-0">
                                <div className="flex items-center text-xs font-medium text-slate-400 space-x-4">
                                    <div className="flex items-center bg-slate-100 px-2 py-1 rounded-md">
                                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                        {set.questions.length} {t("questionsCount")}
                                    </div>
                                    <div className="flex items-center bg-slate-100 px-2 py-1 rounded-md">
                                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                                        {new Date(set.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="p-4 pt-0 mt-auto">
                                <div className="flex w-full items-center gap-2">
                                    <Link href={`/host/${set.id}`} className="flex-[2]">
                                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm transition-all hover:-translate-y-0.5" size="sm">
                                            {t("host")}
                                        </Button>
                                    </Link>
                                    <Link href={`/dashboard/edit-set/${set.id}`} className="flex-[1.5]">
                                        <Button variant="outline" className="w-full border-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-600 font-bold transition-all" size="sm">
                                            {t("edit")}
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSetToDelete(set.id);
                                        }}
                                        title={t("delete")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={!!setToDelete} onOpenChange={(open) => !open && setSetToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteSetWarning")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSet} className="bg-red-600 hover:bg-red-700">
                            {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
