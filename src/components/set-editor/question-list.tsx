"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Trash2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"
import { MathRender } from "@/components/math-render"

// Reuse types from page or define shared types
// For now, let's redefine locally or import if we make a types file.
// Let's assume passed as props nicely.

type Props = {
    questions: any[]
    onAddQuestion: () => void
    onEditQuestion: (q: any) => void
    onDeleteQuestion: (id: string) => void
}

export function QuestionList({ questions, onAddQuestion, onEditQuestion, onDeleteQuestion }: Props) {
    const { t } = useLanguage()

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-4">
                {questions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <p className="text-xl font-bold text-slate-400">{t("noQuestions")}</p>
                        <p className="text-slate-400">{t("clickToAdd")}</p>
                    </div>
                )}

                {questions.map((q, i) => (
                    <Card
                        key={q.id}
                        className="group cursor-pointer hover:shadow-md hover:border-purple-400 transition-all duration-200 border-l-4 border-l-purple-500 overflow-hidden"
                        onClick={() => onEditQuestion(q)}
                    >
                        <CardContent className="p-0 flex">
                            {/* Number */}
                            <div className="w-16 bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xl border-r">
                                {i + 1}
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 p-4 min-w-0">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-4">
                                        {q.image && (
                                            <div className="w-16 h-16 rounded overflow-hidden bg-slate-200 flex-shrink-0 border">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={q.image} alt="Question" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <p className="font-bold text-slate-800 text-lg line-clamp-2">
                                            {q.question ? (
                                                <MathRender text={q.question} inline />
                                            ) : (
                                                <span className="text-slate-400 italic">{t("emptyQuestion")}</span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex items-center space-x-2 pl-4">
                                        <div className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border">
                                            <Clock className="w-3 h-3 mr-1.5" /> {q.timeLimit}s
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); onDeleteQuestion(q.id); }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Options Preview */}
                                <div className="grid grid-cols-2 gap-2">
                                    {q.options.map((opt: string, idx: number) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "px-3 py-2 rounded text-sm truncate border flex items-center",
                                                idx === q.correctAnswer
                                                    ? "bg-green-50 border-green-200 text-green-700 font-bold"
                                                    : "bg-slate-50 border-slate-100 text-slate-500"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-3 h-3 rounded-full mr-2 flex-shrink-0",
                                                idx === q.correctAnswer ? "bg-green-500" : "bg-slate-300"
                                            )} />
                                            {q.optionTypes?.[idx] === "IMAGE" && opt ? (
                                                <div className="w-8 h-8 relative overflow-hidden rounded border bg-white">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={opt} alt="Opt" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="truncate min-w-0 flex-1">
                                                    {opt ? <MathRender text={opt} inline /> : <span className="opacity-40 italic">{t("option")} {idx + 1}</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
