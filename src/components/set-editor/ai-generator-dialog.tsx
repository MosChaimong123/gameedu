"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles, Wand2, FileText, Type, CheckCircle2, Upload, X } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { motion, AnimatePresence } from "framer-motion"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRef } from "react"

interface AIGeneratorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (questions: GeneratedQuestion[]) => void
}

type Step = "INPUT" | "GENERATING" | "PREVIEW"

export type GeneratedQuestion = {
    id: string
    question: string
    image: string | null
    timeLimit: number
    options: string[]
    optionTypes: string[]
    questionType: "MULTIPLE_CHOICE" | "TYPING_ANSWER"
    correctAnswer: number
    explanation: string
}

export function AIGeneratorDialog({ open, onOpenChange, onImport }: AIGeneratorDialogProps) {
    useLanguage()
    const [step, setStep] = useState<Step>("INPUT")
    const [inputType, setInputType] = useState<"TEXT" | "FILE">("TEXT")
    const [content, setContent] = useState("")
    const [count, setCount] = useState(10)
    const [loading, setLoading] = useState(false)
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM")
    const [pdfData, setPdfData] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [isParsing, setIsParsing] = useState(false)

    const handleGenerate = async () => {
        if (!content.trim() && !pdfData) return
        
        setLoading(true)
        setStep("GENERATING")
        setProgress(10)

        // Mock progress animation
        const interval = setInterval(() => {
            setProgress(prev => (prev < 90 ? prev + 5 : prev))
        }, 300)

        try {
            const res = await fetch("/api/ai/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, count, difficulty, pdfData, fileName })
            })

            const data = await res.json()
            
            if (res.ok) {
                setGeneratedQuestions(data)
                setStep("PREVIEW")
                setProgress(100)
            } else {
                throw new Error(data.message || "Failed to generate")
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างคำถามด้วย AI"
            alert(message)
            setStep("INPUT")
        } finally {
            clearInterval(interval)
            setLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        setIsParsing(true)
        
        try {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/ai/parse-file", {
                method: "POST",
                body: formData
            })

            if (res.ok) {
                const data = await res.json()
                setContent(data.text || "")
                if (data.pdfData) {
                    setPdfData(data.pdfData)
                }
            } else {
                throw new Error("Failed to parse file")
            }
        } catch {
            alert("ไม่สามารถอ่านหรือแปลงไฟล์ได้ โปรดลองใหม่")
            setFileName(null)
            setPdfData(null)
        } finally {
            setIsParsing(false)
        }
    }

    const clearFile = () => {
        setFileName(null)
        setContent("")
        setPdfData(null)
    }

    const handleImportAll = () => {
        onImport(generatedQuestions)
        onOpenChange(false)
        // Reset state
        setStep("INPUT")
        setContent("")
        setPdfData(null)
        setFileName(null)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px] w-[95vw] h-[90vh] rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden bg-white flex flex-col">
                <AnimatePresence mode="wait">
                    {step === "INPUT" && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-8 h-full flex flex-col"
                        >
                            <DialogHeader>
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-200">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <DialogTitle className="text-3xl font-black text-slate-800">
                                    สร้างคำถามด้วย AI
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium">
                                    วางข้อความบทเรียน หรืออัปโหลดไฟล์ แล้วให้ Gemini AI สร้างคำถามปรนัย พร้อมตัวเลือกและเฉลยโดยอัตโนมัติ
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-4 my-8">
                                <button
                                    onClick={() => setInputType("TEXT")}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${inputType === "TEXT" ? "bg-white border-purple-600 shadow-xl shadow-purple-50" : "bg-slate-100 border-transparent hover:bg-white"}`}
                                >
                                    <Type className={`w-8 h-8 ${inputType === "TEXT" ? "text-purple-600" : "text-slate-400"}`} />
                                    <span className="text-sm font-black text-slate-700">พิมพ์ข้อความ</span>
                                </button>
                                <button
                                    onClick={() => setInputType("FILE")}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${inputType === "FILE" ? "bg-white border-blue-500 shadow-xl shadow-blue-50" : "bg-slate-100 border-transparent hover:bg-white"}`}
                                >
                                    <FileText className={`w-8 h-8 ${inputType === "FILE" ? "text-blue-500" : "text-slate-400"}`} />
                                    <span className="text-sm font-black text-slate-700">อัปโหลดไฟล์</span>
                                </button>
                            </div>

                            <div className="space-y-4 flex-1 overflow-auto px-1">
                                {inputType === "FILE" ? (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`min-h-[200px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-all cursor-pointer ${fileName ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50"}`}
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileUpload} 
                                            className="hidden" 
                                            accept=".txt,.md,.json,.pdf"
                                        />
                                        
                                        {isParsing ? (
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                                                <p className="text-lg font-bold text-emerald-700">กำลังอ่านและแปลงไฟล์...</p>
                                            </div>
                                        ) : fileName ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mb-2 shadow-lg">
                                                    <FileText className="text-white w-6 h-6" />
                                                </div>
                                                <p className="font-bold text-emerald-700">{fileName}</p>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                                                    className="mt-2 text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline"
                                                >
                                                    ลบไฟล์
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-10 h-10 text-slate-300 mb-4" />
                                                <p className="text-lg font-bold text-slate-600">ลากไฟล์มาวางหรือคลิกเพื่ออัปโหลด (PDF/TXT)</p>
                                                <p className="text-sm text-slate-400 font-medium mt-1">AI จะอ่านข้อความจากไฟล์แล้วสร้างคำถามให้</p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <Textarea
                                        placeholder="วางเนื้อหาบทเรียน บทความ หรือสรุปที่ต้องการให้แปลงเป็นคำถามได้ที่นี่..."
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="min-h-[200px] rounded-2xl border-slate-200 focus:ring-purple-500 text-lg"
                                    />
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2 bg-white p-4 rounded-2xl border border-slate-100">
                                        <span className="font-bold text-slate-600 text-sm">จำนวนคำถาม</span>
                                        <div className="flex gap-2">
                                            {[5, 10, 15, 20].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setCount(n)}
                                                    className={`flex-1 h-10 rounded-xl font-black text-sm transition-all ${count === n ? "bg-purple-600 text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 bg-white p-4 rounded-2xl border border-slate-100">
                                        <span className="font-bold text-slate-600 text-sm">ระดับความยาก</span>
                                        <div className="flex gap-2">
                                            {([
                                                { label: "ง่าย", value: "EASY", color: "text-emerald-500", bg: "bg-emerald-50", active: "bg-emerald-500" },
                                                { label: "ปานกลาง", value: "MEDIUM", color: "text-amber-500", bg: "bg-amber-50", active: "bg-amber-500" },
                                                { label: "ยาก", value: "HARD", color: "text-red-500", bg: "bg-red-50", active: "bg-red-500" }
                                              ] satisfies { label: string; value: "EASY" | "MEDIUM" | "HARD"; color: string; bg: string; active: string }[]).map(d => (
                                                <button
                                                    key={d.value}
                                                    onClick={() => setDifficulty(d.value)}
                                                    className={`flex-1 h-10 rounded-xl font-black text-xs transition-all ${difficulty === d.value ? `${d.active} text-white shadow-lg` : `${d.bg} ${d.color} hover:opacity-80`}`}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8">
                                <Button
                                    onClick={handleGenerate}
                                    disabled={(!content.trim() && !pdfData) || loading}
                                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg font-black shadow-xl"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
                                    สร้างคำถามด้วย AI!
                                </Button>
                            </DialogFooter>
                        </motion.div>
                    )}

                    {step === "GENERATING" && (
                        <motion.div
                            key="generating"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-12 h-full flex flex-col items-center justify-center text-center space-y-8"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="w-32 h-32 rounded-full border-4 border-dashed border-purple-500 opacity-20"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-12 h-12 text-purple-600 animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <DialogTitle className="sr-only">กำลังสร้างคำถามด้วย AI</DialogTitle>
                                <h3 className="text-2xl font-black text-slate-800">Gemini กำลังสร้างคำถาม...</h3>
                                <p className="text-slate-500 font-medium italic">&quot;กำลังวิเคราะห์เนื้อหาและจัดรูปแบบคำถามให้เหมาะกับระดับความยากที่คุณเลือก&quot;</p>
                            </div>
                            <div className="w-full max-w-sm space-y-2">
                                <Progress value={progress} className="h-2 bg-slate-100 rounded-full" />
                                <p className="text-xs font-black text-slate-400 tracking-widest uppercase">{Math.round(progress)}% COMPLETE</p>
                            </div>
                        </motion.div>
                    )}

                    {step === "PREVIEW" && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col h-full bg-slate-50"
                        >
                            <div className="p-8 border-b bg-white flex items-center justify-between shrink-0">
                                <div>
                                    <DialogTitle className="text-3xl font-black text-slate-800">ตรวจสอบคำถามที่สร้างได้ ({generatedQuestions.length} ข้อ)</DialogTitle>
                                    <p className="text-slate-500 font-medium">แก้ไขข้อความหรือตัวเลือกก่อนนำเข้า คลิกไอคอน ✓ เพื่อกำหนดข้อที่ถูกต้อง</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep("INPUT")} className="h-12 rounded-xl font-bold border-2">
                                        กลับไปแก้ไข
                                    </Button>
                                    <Button onClick={handleImportAll} className="h-12 px-8 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-black shadow-lg">
                                        <CheckCircle2 className="mr-2 w-5 h-5" />
                                        นำเข้าทั้งหมด
                                    </Button>
                                </div>
                            </div>
                            
                            <ScrollArea className="flex-1 min-h-0 p-8">
                                <div className="max-w-4xl mx-auto space-y-8 pb-10">
                                    {generatedQuestions.map((q, i) => (
                                        <motion.div 
                                            key={q.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6 relative group"
                                        >
                                            <button 
                                                onClick={() => {
                                                    const newQuestions = generatedQuestions.filter((_, idx) => idx !== i)
                                                    setGeneratedQuestions(newQuestions)
                                                }}
                                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-red-50 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>

                                            <div className="flex gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black flex-shrink-0 shadow-lg">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">คำถาม</label>
                                                    <Textarea 
                                                        value={q.question}
                                                        onChange={(e) => {
                                                            const newQuestions = [...generatedQuestions]
                                                            newQuestions[i].question = e.target.value
                                                            setGeneratedQuestions(newQuestions)
                                                        }}
                                                        className="text-xl font-bold text-slate-800 bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-purple-500 rounded-2xl p-4 min-h-[80px]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pl-12">
                                                {q.options.map((opt: string, idx: number) => (
                                                    <div key={idx} className="space-y-2">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className={`text-[10px] font-black uppercase tracking-tighter ${idx === q.correctAnswer ? "text-emerald-500" : "text-slate-400"}`}>
                                                                ตัวเลือก {idx + 1}
                                                                {idx === q.correctAnswer && " (ข้อถูก)"}
                                                            </label>
                                                        </div>
                                                        <div className="relative group/opt">
                                                            <input 
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newQuestions = [...generatedQuestions]
                                                                    newQuestions[i].options[idx] = e.target.value
                                                                    setGeneratedQuestions(newQuestions)
                                                                }}
                                                                className={`w-full p-4 pr-12 rounded-2xl text-base font-bold transition-all border-2 ${
                                                                    idx === q.correctAnswer 
                                                                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-inner" 
                                                                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                                                                }`}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const newQuestions = [...generatedQuestions]
                                                                    newQuestions[i].correctAnswer = idx
                                                                    setGeneratedQuestions(newQuestions)
                                                                }}
                                                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                                                    idx === q.correctAnswer 
                                                                    ? "bg-emerald-500 text-white" 
                                                                    : "bg-slate-100 text-slate-300 hover:bg-emerald-100 hover:text-emerald-400"
                                                                }`}
                                                            >
                                                                <CheckCircle2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pl-12 space-y-2">
                                                <label className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-lg bg-amber-100 flex items-center justify-center text-xs">💡</span>
                                                    คำอธิบาย (ไม่บังคับ)
                                                </label>
                                                <Textarea 
                                                    value={q.explanation || ""}
                                                    onChange={(e) => {
                                                        const newQuestions = [...generatedQuestions]
                                                        newQuestions[i].explanation = e.target.value
                                                        setGeneratedQuestions(newQuestions)
                                                    }}
                                                    className="bg-amber-50/50 border-amber-100 text-amber-900 rounded-2xl focus-visible:ring-amber-500 min-h-[60px]"
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                    
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            setGeneratedQuestions([...generatedQuestions, {
                                                id: crypto.randomUUID(),
                                                question: "พิมพ์คำถามใหม่ที่นี่...",
                                                image: null,
                                                timeLimit: 20,
                                                options: ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
                                                optionTypes: ["TEXT", "TEXT", "TEXT", "TEXT"],
                                                questionType: "MULTIPLE_CHOICE",
                                                correctAnswer: 0,
                                                explanation: ""
                                            }])
                                        }}
                                        className="w-full h-20 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all font-black text-lg"
                                    >
                                        + เพิ่มคำถามเปล่า 1 ข้อ
                                    </Button>
                                </div>
                            </ScrollArea>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}







