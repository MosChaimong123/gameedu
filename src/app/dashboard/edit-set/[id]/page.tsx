"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Save, Globe, Lock, PenSquare, FileText, Image as ImageIcon, Sparkles } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { SettingsDialog } from "@/components/set-editor/settings-dialog"
import { QuestionList, type QuestionListItem } from "@/components/set-editor/question-list"
import { EditorDialog, type EditableQuestion } from "@/components/set-editor/editor-dialog"
import { ImportSpreadsheetDialog } from "@/components/set-editor/import-spreadsheet-dialog"
import { AIGeneratorDialog, type GeneratedQuestion } from "@/components/set-editor/ai-generator-dialog"
import { PageBackLink } from "@/components/ui/page-back-link"
import { useToast } from "@/components/ui/use-toast"
import { getLimitsForUser } from "@/lib/plan/plan-access"
import { isTeacherOrAdmin } from "@/lib/role-guards"
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

// Types matching Prisma Schema
// TODO: Move to a shared types file
export type Question = {
    id: string
    question: string
    image?: string | null
    timeLimit: number
    options: string[]
    optionTypes: string[] // "TEXT" | "IMAGE" | "MATH"
    questionType: "MULTIPLE_CHOICE" | "TYPING_ANSWER"
    correctAnswer: number
    randomOrder?: boolean
}

export type QuestionSet = {
    id: string
    title: string
    description: string | null
    questions: Question[]
    isPublic: boolean
    coverImage: string | null
}

type ImportedQuestionInput = {
    question?: string
    timeLimit?: number
    options?: string[]
    questionType?: string
    correctAnswer?: number
}

export default function EditSetPage() {
    const params = useParams()
    const router = useRouter()
    const { data: session, status } = useSession()
    const setId = params.id as string
    const { t } = useLanguage()
    const { toast } = useToast()

    const [set, setSet] = useState<QuestionSet | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Editor State
    const [activeQuestion, setActiveQuestion] = useState<Question | null>(null)
    const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false)
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
    const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
    const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false)
    const [pendingDeleteQuestionId, setPendingDeleteQuestionId] = useState<string | null>(null)

    const searchParams = useSearchParams()

    const planLimits =
        session?.user != null ? getLimitsForUser(session.user.role, session.user.plan) : null
    const aiAllowed = planLimits?.aiQuestionGeneration ?? false

    useEffect(() => {
        if (status === "authenticated" && !isTeacherOrAdmin(session.user.role)) {
            router.replace("/dashboard")
        }
    }, [router, session, status])

    useEffect(() => {
        if (searchParams.get("openImport") === "true") {
            setIsSpreadsheetOpen(true)
        }
    }, [searchParams])

    useEffect(() => {
        if (status !== "authenticated" || !isTeacherOrAdmin(session.user.role)) {
            return
        }

        async function fetchSet() {
            try {
                const res = await fetch(`/api/sets/${setId}`)
                if (res.ok) {
                    const data = await res.json()
                    setSet(data)
                } else {
                    router.push("/dashboard")
                }
            } catch (error) {
                console.error("Failed to fetch set", error)
            } finally {
                setLoading(false)
            }
        }
        fetchSet()
    }, [setId, router, session, status])

    if (status === "loading") {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (status === "authenticated" && !isTeacherOrAdmin(session.user.role)) {
        return null
    }

    const handleSaveSet = async () => {
        if (!set) return
        setSaving(true)
        try {
            const res = await fetch(`/api/sets/${setId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(set),
            })
            if (!res.ok) throw new Error("editSetSaveFailed")
            toast({
                title: t("editSetSaveSuccessTitle"),
                description: t("editSetSaveSuccessDesc"),
            })
            router.push("/dashboard/my-sets")
            // Optional: Show happiness/success toast
        } catch {
            toast({
                title: t("editSetSaveFailTitle"),
                description: t("editSetSaveFailDesc"),
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const addNewQuestion = () => {
        const newQ: Question = {
            id: crypto.randomUUID(),
            question: "",
            image: null,
            timeLimit: 20,
            options: ["", "", "", ""],
            optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: 0
        }
        setActiveQuestion(newQ)
        setIsQuestionDialogOpen(true)
    }

    const editQuestion = (q: QuestionListItem) => {
        setActiveQuestion({
            id: q.id,
            question: q.question || "",
            image: q.image ?? null,
            timeLimit: q.timeLimit,
            options: q.options,
            optionTypes: q.optionTypes ?? ["TEXT", "TEXT", "TEXT", "TEXT"],
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: q.correctAnswer,
        })
        setIsQuestionDialogOpen(true)
    }

    const saveQuestion = () => {
        if (!set || !activeQuestion) return

        const updatedQuestions = [...set.questions]
        const index = updatedQuestions.findIndex(q => q.id === activeQuestion.id)

        if (index >= 0) {
            updatedQuestions[index] = activeQuestion
        } else {
            updatedQuestions.push(activeQuestion)
        }

        setSet({ ...set, questions: updatedQuestions })
        setIsQuestionDialogOpen(false)
    }

    const handleImportQuestions = (importedQuestions: ImportedQuestionInput[] | GeneratedQuestion[]) => {
        if (!set) return

        // Map imported questions to ensure they conform to our Question type
        const newQuestions: Question[] = importedQuestions.map((q) => ({
            id: crypto.randomUUID(),
            question: q.question || "",
            image: null,
            timeLimit: q.timeLimit || 20,
            options: [
                q.options?.[0] || "",
                q.options?.[1] || "",
                q.options?.[2] || "",
                q.options?.[3] || ""
            ],
            // Default to TEXT for imported options for now
            optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
            questionType: q.questionType === "TYPING_ANSWER" ? "TYPING_ANSWER" : "MULTIPLE_CHOICE",
            // Preserve correct answer if provided (e.g. from AI), otherwise default to 0 (for spreadsheet)
            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0
        }))

        setSet(prev => prev ? ({
            ...prev,
            questions: [...prev.questions, ...newQuestions]
        }) : null)
    }

    const deleteQuestion = (qId: string) => {
        if (!set) return
        const updatedQuestions = set.questions.filter((q) => q.id !== qId)
        setSet({ ...set, questions: updatedQuestions })
        setPendingDeleteQuestionId(null)
    }

    const handleUpdateSettings = (data: { title: string; description: string; coverImage: string; isPublic: boolean }) => {
        if (!set) return
        setSet({ ...set, ...data })
    }

    if (loading) {
        return (
            <div className="flex h-[calc(100dvh-6rem)] min-h-[12rem] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        )
    }

    if (!set) return <div>{t("noSetsTitle")}</div>

    return (
        <div className="flex h-[calc(100dvh-6rem)] min-h-0 overflow-hidden rounded-xl bg-slate-50">
            {/* Left Sidebar - Fixed Layout */}
            <div className="w-80 bg-white border-r flex-shrink-0 flex flex-col h-full overflow-y-auto">
                <div className="p-6 space-y-6">
                    <PageBackLink href="/dashboard/my-sets" labelKey="navBackMySets" />
                    {/* Cover Image & Title Block */}
                    <div className="space-y-4">
                        <div className="aspect-[4/3] rounded-xl bg-slate-100 overflow-hidden border-2 border-slate-100 shadow-sm relative group">
                            {set.coverImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={set.coverImage} alt={t("coverImageAlt")} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <ImageIcon className="w-12 h-12 mb-2" />
                                </div>
                            )}
                            {/* Overlay to hint editing */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => setIsInfoDialogOpen(true)}>
                                <span className="bg-black/50 text-white px-3 py-1 rounded text-sm font-bold">{t("changeCover")}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-800 leading-tight break-words">{set.title}</h2>
                            <div className="flex items-center text-sm font-bold text-slate-400">
                                {set.isPublic ? <Globe className="w-4 h-4 mr-1.5" /> : <Lock className="w-4 h-4 mr-1.5" />}
                                {set.isPublic ? t("public") : t("private")}
                            </div>
                        </div>
                    </div>

                    {/* Main Save Action */}
                    <Button
                        onClick={handleSaveSet}
                        disabled={saving}
                        className="w-full h-12 text-lg font-bold bg-teal-500 hover:bg-teal-600 shadow-sm transition-all active:scale-95"
                    >
                        {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-5 h-5" />}
                        {t("saveSet")}
                    </Button>

                    {/* Secondary Actions */}
                    {/* Secondary Actions */}
                    <Button variant="outline" className="w-full h-10 border-2 font-bold text-slate-600" onClick={() => setIsInfoDialogOpen(true)}>
                        <PenSquare className="w-4 h-4 mr-2" />
                        {t("editInfo")}
                    </Button>

                    {/* Import/Add Options Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-6 border-t font-black">
                        <Button
                            className="h-24 flex flex-col items-center justify-center bg-purple-600 hover:bg-purple-700 p-0 shadow-lg shadow-purple-100 border-0 transition-all hover:scale-[1.02] active:scale-95 text-white"
                            onClick={addNewQuestion}
                        >
                            <Plus className="w-8 h-8 mb-1" />
                            <span className="text-xs">{t("addQuestion")}</span>
                        </Button>
                        <Button
                            className="h-24 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 p-0 shadow-lg shadow-indigo-100 border-0 transition-all hover:scale-[1.02] active:scale-95 text-white disabled:opacity-40 disabled:pointer-events-none"
                            disabled={!aiAllowed}
                            title={!aiAllowed ? t("editSetAiPlanLockedHint") : undefined}
                            onClick={() => aiAllowed && setIsAIDialogOpen(true)}
                        >
                            <Sparkles className="w-8 h-8 mb-1" />
                            <span className="text-xs">{t("editSetAiCreate")}</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 col-span-2 flex items-center justify-center border-2 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 font-bold mt-2"
                            onClick={() => setIsSpreadsheetOpen(true)}
                        >
                            <FileText className="w-5 h-5 mr-2" />
                            <span className="text-sm">{t("spreadsheetImport")}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Right Content - Scrollable */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Top Bar */}
                {/* Top Bar */}
                <div className="h-20 border-b bg-white px-8 flex items-center justify-between flex-shrink-0">
                    <div className="text-xl font-bold text-slate-700">
                        {set.questions.length} <span className="text-slate-400 ml-1">{t("questionsCount")}</span>
                    </div>
                </div>

                {/* Question List Area */}
                <QuestionList
                    questions={set.questions}
                    onAddQuestion={addNewQuestion}
                    onEditQuestion={editQuestion}
                    onDeleteQuestion={setPendingDeleteQuestionId}
                />
            </div>

            {/* Dialogs */}

            <SettingsDialog
                open={isInfoDialogOpen}
                onOpenChange={setIsInfoDialogOpen}
                title={set.title}
                description={set.description || ""}
                coverImage={set.coverImage || ""}
                isPublic={set.isPublic}
                onUpdate={handleUpdateSettings}
            />

            <EditorDialog
                open={isQuestionDialogOpen}
                onOpenChange={setIsQuestionDialogOpen}
                activeQuestion={activeQuestion}
                setActiveQuestion={(q: EditableQuestion) => {
                    setActiveQuestion((prev) => ({
                        id: q.id ?? prev?.id ?? crypto.randomUUID(),
                        question: q.question,
                        image: q.image ?? null,
                        timeLimit: q.timeLimit,
                        options: q.options,
                        optionTypes: q.optionTypes ?? prev?.optionTypes ?? ["TEXT", "TEXT", "TEXT", "TEXT"],
                        questionType: q.questionType ?? prev?.questionType ?? "MULTIPLE_CHOICE",
                        correctAnswer: q.correctAnswer ?? prev?.correctAnswer ?? 0,
                        randomOrder: q.randomOrder ?? prev?.randomOrder,
                    }))
                }}
                onSave={saveQuestion}
            />

            <ImportSpreadsheetDialog
                open={isSpreadsheetOpen}
                onOpenChange={setIsSpreadsheetOpen}
                onImport={handleImportQuestions}
            />

            <AIGeneratorDialog
                open={isAIDialogOpen}
                onOpenChange={setIsAIDialogOpen}
                onImport={handleImportQuestions}
            />

            <AlertDialog open={!!pendingDeleteQuestionId} onOpenChange={(open) => !open && setPendingDeleteQuestionId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("editSetDeleteQTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("editSetDeleteQDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault()
                                if (!pendingDeleteQuestionId) return
                                deleteQuestion(pendingDeleteQuestionId)
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {t("editSetDeleteQAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
