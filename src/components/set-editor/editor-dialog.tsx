"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Clock, Save, Image as ImageIcon, CheckCircle2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"
import { ImageUpload } from "@/components/image-upload"
import { MathKeyboard } from "./math-keyboard"
import { MathRender } from "@/components/math-render"
import { useState } from "react"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    activeQuestion: any
    setActiveQuestion: (q: any) => void
    onSave: () => void
}

export function EditorDialog({ open, onOpenChange, activeQuestion, setActiveQuestion, onSave }: Props) {
    const { t } = useLanguage()
    const [isMathOpen, setIsMathOpen] = useState(false)
    const [isEditingQuestion, setIsEditingQuestion] = useState(false)
    const [activeField, setActiveField] = useState<"question" | number>("question")

    if (!activeQuestion) return null

    const handleInsertMath = (latex: string) => {
        if (activeField === "question") {
            const newText = activeQuestion.question + " " + latex + " "
            setActiveQuestion({ ...activeQuestion, question: newText })
        } else if (typeof activeField === "number") {
            const idx = activeField
            const newOpts = [...activeQuestion.options]
            newOpts[idx] = (newOpts[idx] || "") + " " + latex + " "
            setActiveQuestion({ ...activeQuestion, options: newOpts })
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-none w-[95vw] md:w-[90vw] lg:w-[85vw] h-[90vh] p-0 gap-0 bg-slate-100 overflow-hidden border-none outline-none flex flex-col">
                    <DialogTitle className="sr-only">Question Editor</DialogTitle>

                    {/* Purple Header Bar */}
                    <div className="bg-purple-600 h-20 flex items-center justify-between px-6 text-white shadow-md flex-shrink-0 z-10 transition-all">
                        {/* Left Controls */}
                        <div className="flex items-center space-x-3">
                            {/* Time Limit Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="group flex items-center bg-purple-700/60 hover:bg-purple-700 rounded-xl px-4 py-2 border-2 border-purple-400/40 cursor-pointer transition-all active:scale-95 select-none w-32 justify-between">
                                        <div className="flex items-center">
                                            <Clock className="w-6 h-6 mr-3 text-purple-200 group-hover:text-white" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-extrabold tracking-wider text-purple-200 uppercase">{t("timeLimit")}</span>
                                                <span className="text-2xl font-black leading-none">{activeQuestion.timeLimit}</span>
                                            </div>
                                        </div>
                                        <div className="text-purple-300 group-hover:text-white text-[10px]">▲</div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-32 p-1 bg-purple-800 border-purple-600 text-white">
                                    <div className="flex flex-col space-y-1 max-h-60 overflow-y-auto">
                                        {[5, 10, 20, 30, 60, 90, 120, 240].map((time) => (
                                            <button
                                                key={time}
                                                onClick={() => setActiveQuestion({ ...activeQuestion, timeLimit: time })}
                                                className={cn(
                                                    "px-2 py-1.5 rounded text-sm font-bold transition-colors text-left pl-3",
                                                    activeQuestion.timeLimit === time ? "bg-purple-600 text-white" : "hover:bg-purple-700/50 text-purple-200"
                                                )}
                                            >
                                                {time} {t("seconds")}
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Random Order */}
                            <div
                                className="group flex items-center bg-purple-700/60 hover:bg-purple-700 rounded-xl px-4 py-2 border-2 border-purple-400/40 cursor-pointer transition-all active:scale-95 select-none"
                                onClick={() => {
                                    const isRandom = (activeQuestion as any).randomOrder || false
                                    setActiveQuestion({ ...activeQuestion, randomOrder: !isRandom } as any)
                                }}
                            >
                                <div className="flex flex-col leading-none mr-3">
                                    <span className="text-[10px] font-extrabold tracking-wider text-purple-200 uppercase">{t("randomOrder")}</span>
                                    <span className="text-sm font-bold">Order</span>
                                </div>
                                <div className={cn(
                                    "w-6 h-6 border-2 rounded flex items-center justify-center transition-all",
                                    (activeQuestion as any).randomOrder ? "bg-purple-500 border-white" : "border-purple-300/50 bg-transparent"
                                )}>
                                    {(activeQuestion as any).randomOrder && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                            </div>

                            {/* Question Type Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="hidden md:flex flex-col justify-center bg-purple-700/60 hover:bg-purple-700 rounded-xl px-4 py-2 border-2 border-purple-400/40 cursor-pointer transition-all active:scale-95 select-none min-w-[140px]">
                                        <span className="text-[10px] font-extrabold tracking-wider text-purple-200 uppercase text-center w-full">{t("selectQuestionType")}</span>
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-sm font-bold text-center">
                                                {activeQuestion.questionType === "TYPING_ANSWER" ? t("typingAnswer") : t("multipleChoice")}
                                            </span>
                                            <span className="text-[10px] text-purple-300">▼</span>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0 bg-white border-0 shadow-xl overflow-hidden rounded-xl">
                                    <div className="bg-purple-600 p-3 text-center">
                                        <span className="text-white font-bold">{t("selectQuestionType")}</span>
                                    </div>
                                    <div className="flex flex-col p-2 bg-slate-100 gap-2">
                                        <button
                                            onClick={() => setActiveQuestion({ ...activeQuestion, questionType: "MULTIPLE_CHOICE" })}
                                            className={cn("flex items-center p-3 rounded-lg border-2 transition-all hover:scale-[1.02]", activeQuestion.questionType === "MULTIPLE_CHOICE" ? "bg-blue-500 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 hover:border-blue-300 text-slate-700")}
                                        >
                                            <div className="w-8 h-8 rounded bg-white/20 mr-3 flex items-center justify-center">
                                                <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                                                    <div className="bg-current opacity-80 rounded-[1px]" />
                                                    <div className="bg-current opacity-80 rounded-[1px]" />
                                                    <div className="bg-current opacity-80 rounded-[1px]" />
                                                    <div className="bg-current opacity-80 rounded-[1px]" />
                                                </div>
                                            </div>
                                            <span className="font-bold">{t("multipleChoice")}</span>
                                        </button>

                                        <button
                                            onClick={() => setActiveQuestion({ ...activeQuestion, questionType: "TYPING_ANSWER" })}
                                            className={cn("flex items-center p-3 rounded-lg border-2 transition-all hover:scale-[1.02]", activeQuestion.questionType === "TYPING_ANSWER" ? "bg-blue-500 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 hover:border-blue-300 text-slate-700")}
                                        >
                                            <div className="w-8 h-8 rounded bg-white/20 mr-3 flex items-center justify-center">
                                                <span className="font-mono font-bold text-lg">Aa</span>
                                            </div>
                                            <span className="font-bold">{t("typingAnswer")}</span>
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Right Controls */}
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" className="text-purple-200 hover:text-white hover:bg-purple-700" onClick={() => onOpenChange(false)}>
                                <X className="w-5 h-5 mr-1" /> {t("cancel")}
                            </Button>
                            <Button className="bg-white text-purple-700 hover:bg-purple-50 font-bold shadow-lg border-b-4 border-purple-200 active:border-b-0 active:translate-y-1 transition-all" onClick={onSave}>
                                <Save className="w-4 h-4 mr-2" /> {t("save")}
                            </Button>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-4rem)]">
                        {/* Question Area */}
                        <div className="bg-white rounded-xl shadow-sm min-h-[240px] flex overflow-hidden mb-6 relative group">
                            {/* Image Upload Area - If visible */}
                            {activeQuestion.image && (
                                <div className="w-1/3 bg-slate-100 border-r border-slate-200 relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={activeQuestion.image} alt="Question" className="w-full h-full object-contain" />
                                    <button
                                        onClick={() => setActiveQuestion({ ...activeQuestion, image: null })}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Sidebar Tools - Hidden if Image is uploaded? No, side-by-side? */}
                            {/* Let's put tools on side ALWAYS */}
                            <div className="flex flex-col gap-2 p-3 bg-slate-50 border-r border-slate-100 w-16 items-center flex-shrink-0 z-10">
                                {/* Image Upload Button using component logic but custom trigger */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button size="icon" className="h-10 w-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white shadow-sm" title={t("image")}>
                                            <ImageIcon className="h-5 w-5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-4">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm">{t("imageGallery")}</h4>
                                            <ImageUpload
                                                value={activeQuestion.image || ""}
                                                onChange={(val) => setActiveQuestion({ ...activeQuestion, image: val })}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <Button
                                    size="icon"
                                    className="h-10 w-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                                    title={t("mathEquation")}
                                    onClick={() => setIsMathOpen(true)}
                                >
                                    <span className="font-serif italic font-bold text-lg">x²</span>
                                </Button>
                                <Button size="icon" className="h-10 w-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white shadow-sm opacity-50 cursor-not-allowed" title={t("audio")}>
                                    <span className="font-bold">♪</span>
                                </Button>
                            </div>

                            {/* Text Area / Math Preview Area */}
                            <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden w-full">
                                {!isEditingQuestion && activeQuestion.question ? (
                                    <div
                                        className="w-full h-full flex flex-col items-center justify-center cursor-text group/preview transition-all hover:bg-slate-50 rounded-lg border-2 border-transparent hover:border-blue-100 outline-none focus:ring-2 focus:ring-blue-400"
                                        onClick={() => {
                                            setIsEditingQuestion(true)
                                            setActiveField("question")
                                        }}
                                        tabIndex={0}
                                        role="button"
                                        aria-label="Edit Question"
                                        data-testid="question-preview"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                setIsEditingQuestion(true)
                                                setActiveField("question")
                                            }
                                        }}
                                    >
                                        <div className="text-3xl font-medium text-slate-700 leading-relaxed text-center break-words max-w-full">
                                            <MathRender text={activeQuestion.question} />
                                        </div>
                                        <span className="text-xs text-slate-300 font-bold uppercase mt-4 opacity-0 group-hover/preview:opacity-100 transition-opacity select-none">
                                            {t("clickToEdit")}
                                        </span>
                                    </div>
                                ) : (
                                    <Textarea
                                        id="question-input"
                                        name="question-input"
                                        data-testid="question-input"
                                        className="w-full h-full border-none resize-none text-center text-3xl font-medium text-slate-700 p-0 leading-relaxed focus-visible:ring-0 placeholder:text-slate-300 flex items-center justify-center bg-transparent"
                                        placeholder={t("questionTextPlaceholder")}
                                        value={activeQuestion.question}
                                        onChange={(e) => setActiveQuestion({ ...activeQuestion, question: e.target.value })}
                                        onBlur={() => setIsEditingQuestion(false)}
                                        onFocus={() => setActiveField("question")}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>

                        {/* Answers Grid */}
                        {/* Answers Area */}
                        {activeQuestion.questionType === "TYPING_ANSWER" ? (
                            <div className="flex justify-center">
                                <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border-b-4 border-slate-200 p-6">
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-slate-700">{t("possibleAnswers")}</h3>
                                        <p className="text-slate-400 text-sm font-bold">{t("notCaseSensitive")}</p>
                                    </div>

                                    <div className="space-y-3">
                                        {activeQuestion.options.filter((o: string) => o !== "").length === 0 && (
                                            <div className="text-center bg-slate-100 rounded-lg p-3 text-slate-400 font-bold text-sm mb-2">
                                                {t("atLeastOneAnswer")}
                                            </div>
                                        )}

                                        {/* Existing Answers */}
                                        {activeQuestion.options.map((opt: string, idx: number) => (
                                            <div key={idx} className="flex gap-2">
                                                {/* Logic Dropdown (Visual Only) */}
                                                <div className="w-40 flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center justify-between px-3 font-bold text-sm cursor-pointer border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all select-none">
                                                    <span>{t("isExactly")}</span>
                                                    <span className="text-[10px]">▼</span>
                                                </div>

                                                <div className="flex-1 relative">
                                                    <Input
                                                        value={opt}
                                                        placeholder={`${t("option")} ${idx + 1}`}
                                                        className="h-12 text-lg font-bold bg-blue-600 text-white placeholder:text-blue-300 border-none rounded-lg shadow-inner px-4 focus-visible:ring-2 focus-visible:ring-blue-400"
                                                        onChange={(e) => {
                                                            const newOpts = [...activeQuestion.options];
                                                            newOpts[idx] = e.target.value;
                                                            setActiveQuestion({ ...activeQuestion, options: newOpts });
                                                        }}
                                                    />
                                                    {/* Delete button if multiple */}
                                                    {activeQuestion.options.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                const newOpts = activeQuestion.options.filter((_: any, i: number) => i !== idx);
                                                                setActiveQuestion({ ...activeQuestion, options: newOpts });
                                                            }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white p-1"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add Button */}
                                        <Button
                                            onClick={() => setActiveQuestion({ ...activeQuestion, options: [...activeQuestion.options, ""] })}
                                            className="w-full h-12 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-lg border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all mt-4"
                                        >
                                            {t("addAltAnswer")}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeQuestion.options.map((opt: string, i: number) => {
                                    // Specific Blooket Colors
                                    const styles = [
                                        { bg: "bg-amber-500", hover: "hover:bg-amber-600", border: "border-amber-600" }, // 1 (Yellow/Orange)
                                        { bg: "bg-blue-500", hover: "hover:bg-blue-600", border: "border-blue-600" },   // 2 (Blue)
                                        { bg: "bg-green-500", hover: "hover:bg-green-600", border: "border-green-600" }, // 3 (Green)
                                        { bg: "bg-red-500", hover: "hover:bg-red-600", border: "border-red-600" },     // 4 (Red)
                                    ]
                                    const style = styles[i % 4]
                                    const isImageOption = activeQuestion.optionTypes?.[i] === "IMAGE"

                                    return (
                                        <div
                                            key={i}
                                            className={cn(
                                                "h-32 rounded-xl transition-all relative flex flex-col items-center justify-center shadow-sm border-b-4 overflow-hidden group/opt",
                                                style.bg,
                                                style.border,
                                            )}
                                        >
                                            {/* Checkbox (Custom) */}
                                            <div
                                                onClick={() => setActiveQuestion({ ...activeQuestion, correctAnswer: i })}
                                                className={cn(
                                                    "absolute top-3 left-3 w-8 h-8 rounded-lg border-2 z-20 cursor-pointer flex items-center justify-center transition-all bg-white/20 hover:bg-white/30",
                                                    activeQuestion.correctAnswer === i ? "bg-white/100 border-white" : "border-white/50"
                                                )}
                                            >
                                                {activeQuestion.correctAnswer === i && <CheckCircle2 className={cn("w-6 h-6", i === 0 ? "text-amber-500" : i === 1 ? "text-blue-500" : i === 2 ? "text-green-500" : "text-red-500")} />}
                                            </div>

                                            <div className="absolute top-2 right-2 z-20 flex gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded bg-white/20 hover:bg-white/40 text-white font-serif italic font-bold"
                                                    title="Add Equation"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setActiveField(i)
                                                        setIsMathOpen(true)
                                                    }}
                                                >
                                                    x²
                                                </Button>
                                                <Popover>
                                                    <PopoverTrigger asChild>

                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded bg-white/20 hover:bg-white/40 text-white" title="Add Image">
                                                            <ImageIcon className="w-5 h-5" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-4">
                                                        <div className="space-y-2">
                                                            <h4 className="font-bold text-sm">{t("imageGallery")}</h4>
                                                            <ImageUpload
                                                                value={isImageOption ? opt : ""}
                                                                onChange={(val) => {
                                                                    const newOpts = [...activeQuestion.options]
                                                                    newOpts[i] = val

                                                                    const newTypes = [...(activeQuestion.optionTypes || ["TEXT", "TEXT", "TEXT", "TEXT"])]
                                                                    newTypes[i] = "IMAGE"

                                                                    setActiveQuestion({ ...activeQuestion, options: newOpts, optionTypes: newTypes })
                                                                }}
                                                            />
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>

                                                {isImageOption && (
                                                    <Button
                                                        size="icon"
                                                        className="h-8 w-8 rounded bg-red-500/80 hover:bg-red-600 text-white"
                                                        onClick={() => {
                                                            const newOpts = [...activeQuestion.options]
                                                            newOpts[i] = ""
                                                            const newTypes = [...(activeQuestion.optionTypes || ["TEXT", "TEXT", "TEXT", "TEXT"])]
                                                            newTypes[i] = "TEXT"
                                                            setActiveQuestion({ ...activeQuestion, options: newOpts, optionTypes: newTypes })
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Content */}
                                            {isImageOption ? (
                                                <div className="w-full h-full p-2 flex items-center justify-center">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={opt} alt="Option" className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
                                                </div>
                                            ) : (
                                                <div className="w-full h-full relative">
                                                    <Input
                                                        className="w-full h-full bg-transparent border-none text-white placeholder:text-white/60 text-xl font-bold text-center focus-visible:ring-0 focus-visible:bg-black/10 transition-colors pt-8"
                                                        placeholder={`${t("option")} ${i + 1}`}
                                                        value={opt}
                                                        onFocus={() => setActiveField(i)}
                                                        onChange={(e) => {
                                                            const newOpts = [...activeQuestion.options]
                                                            newOpts[i] = e.target.value
                                                            setActiveQuestion({ ...activeQuestion, options: newOpts })
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <MathKeyboard
                open={isMathOpen}
                onOpenChange={setIsMathOpen}
                onInsert={handleInsertMath}
            />
        </>
    )
}

