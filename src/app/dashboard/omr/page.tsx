"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { 
    Plus, 
    Camera, 
    Printer, 
    BarChart3, 
    ChevronRight, 
    Trash2, 
    Edit3, 
    Loader2,
    CheckCircle2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { OMRKeyEditor } from "@/components/omr/omr-key-editor"
import { useToast } from "@/components/ui/use-toast"
import { PageBackLink } from "@/components/ui/page-back-link"

type OMRQuiz = {
    id: string
    title: string
    questionCount: number
    answerKey: Record<string, string>
    showResults?: boolean
    _count?: {
        results: number
    }
    results?: {
        id: string
        studentName: string
        scannedAt: string
        score: number
        total: number
    }[]
}

export default function OMRDashboardPage() {
    const { toast } = useToast()
    const [quizzes, setQuizzes] = useState<OMRQuiz[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
    const [selectedQuiz, setSelectedQuiz] = useState<OMRQuiz | null>(null)
    
    // New Quiz State
    const [newQuiz, setNewQuiz] = useState({ title: "", questionCount: 20 })

    const fetchQuizzes = useCallback(async () => {
        try {
            const res = await fetch("/api/omr/quizzes")
            const data = await res.json()
            setQuizzes(Array.isArray(data) ? data : [])
        } catch {
            toast({ title: "โหลดข้อมูลไม่สำเร็จ", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    useEffect(() => {
        fetchQuizzes()
    }, [fetchQuizzes])

    const handleCreateQuiz = async () => {
        if (!newQuiz.title) return
        try {
            const res = await fetch("/api/omr/quizzes", {
                method: "POST",
                body: JSON.stringify(newQuiz)
            })
            const data = await res.json()
            setQuizzes([data, ...quizzes])
            setIsCreateModalOpen(false)
            toast({ title: "สร้างเฉลยใหม่สำเร็จ!" })
        } catch {
            toast({ title: "สร้างไม่สำเร็จ", variant: "destructive" })
        }
    }

    const handleUpdateKey = async (newKey: Record<string, string>) => {
        if (!selectedQuiz) return
        try {
            const res = await fetch(`/api/omr/quizzes/${selectedQuiz.id}`, {
                method: "PUT",
                body: JSON.stringify({ answerKey: newKey })
            })
            const data = await res.json()
            setQuizzes(quizzes.map((q) => q.id === data.id ? data : q))
            setSelectedQuiz(data)
            toast({ title: "บันทึกเฉลยเรียบร้อย" })
        } catch {
            toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" })
        }
    }

    const handleDeleteQuiz = async (id: string) => {
        if (!confirm("ยืนยันการลบเฉลยนี้?")) return
        try {
            await fetch(`/api/omr/quizzes/${id}`, { method: "DELETE" })
            setQuizzes(quizzes.filter((q) => q.id !== id))
            toast({ title: "ลบสำเร็จ" })
        } catch {
            toast({ title: "ลบไม่สำเร็จ", variant: "destructive" })
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="space-y-4">
                        <PageBackLink href="/dashboard" label="แดชบอร์ด" />
                        <div>
                            <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">ระบบ OMR Digital</h1>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Manage Answer Keys & Scan Results</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-16 px-8 rounded-[2rem] bg-slate-900 text-white font-black text-lg shadow-xl shadow-slate-200 hover:bg-purple-600 transition-all hover:scale-105"
                    >
                        <Plus className="mr-2 w-6 h-6" />
                        เริ่มสร้างเฉลยใหม่
                    </Button>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Quizzes List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest">รายการชุดตรวจของฉัน</h2>
                            <span className="bg-slate-200 px-3 py-1 rounded-full text-[10px] font-black text-slate-500">{quizzes.length} รายการ</span>
                        </div>

                        {isLoading ? (
                            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                <Loader2 className="w-12 h-12 animate-spin text-slate-300 mb-4" />
                                <p className="font-black text-slate-400">กำลังดึงข้อมูลระบบ OMR...</p>
                            </div>
                        ) : quizzes.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                    <BarChart3 className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-400 mb-2">ยังไม่มีชุดตรวจเฉลย</h3>
                                <p className="text-sm text-slate-400 font-medium max-w-xs">เริ่มต้นด้วยการกดปุ่ม &quot;เริ่มสร้างเฉลยใหม่&quot; ด้านบนเพื่อเปิดระบบการตรวจครับ</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {quizzes.map((quiz) => (
                                    <motion.div 
                                        key={quiz.id}
                                        layoutId={quiz.id}
                                        className="group bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-purple-200 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border border-purple-100 group-hover:from-purple-600 group-hover:to-indigo-600 transition-all">
                                                    <CheckCircle2 className="w-10 h-10 text-purple-400 group-hover:text-white transition-colors" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-slate-800 mb-1">{quiz.title}</h3>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-lg">{quiz.questionCount} ข้อ</span>
                                                        <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">
                                                            {quiz.results?.length || quiz._count?.results || 0} สแกนสำเร็จ
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => { setSelectedQuiz(quiz); setIsKeyModalOpen(true); }}
                                                    className="w-12 h-12 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleDeleteQuiz(quiz.id)}
                                                    className="w-12 h-12 rounded-2xl hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                                <Link href={`/dashboard/omr-scanner?quizId=${quiz.id}`}>
                                                    <Button className="h-14 px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-lg shadow-purple-200">
                                                        <Camera className="mr-2 w-5 h-5" />
                                                        สแกนคะแนน
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Tools & Tips */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
                            <h2 className="text-2xl font-black mb-6 relative z-10">เครื่องมือด่วน</h2>
                            <div className="space-y-4 relative z-10">
                                <Link href="/dashboard/omr-templates" className="flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <Printer className="w-6 h-6 text-indigo-400" />
                                        <span className="font-bold">พิมพ์กระดาษคำตอบ</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
                                </Link>
                                <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 text-emerald-100 text-xs font-medium leading-relaxed">
                                    <p className="font-black text-emerald-400 mb-1 uppercase tracking-widest">💡 เทคนิคแนะนำ</p>
                                    นักเรียนควรใช้ปากกาสีดำระบายให้เต็มวงเพื่อให้ AI ตรวจจับได้แม่นยำที่สุดครับ
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Quiz Modal (Simplified) */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl"
                        >
                            <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">เริ่มสร้างเฉลยใหม่</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">ชื่อชุดข้อสอบ</label>
                                    <input 
                                        type="text" 
                                        placeholder="เช่น ปลายภาควิชาประวัติศาสตร์"
                                        value={newQuiz.title}
                                        onChange={(e) => setNewQuiz({...newQuiz, title: e.target.value})}
                                        className="w-full h-14 px-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-purple-600 font-bold transition-all mt-2"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">เลือกจำนวนข้อ</label>
                                    <div className="grid grid-cols-3 gap-3 mt-2">
                                        {[20, 50, 80].map((num) => (
                                            <button
                                                key={num}
                                                onClick={() => setNewQuiz({...newQuiz, questionCount: num})}
                                                className={`h-12 rounded-xl font-black text-xs transition-all ${newQuiz.questionCount === num ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                            >
                                                {num} ข้อ
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <Button variant="ghost" className="flex-1 h-16 rounded-2xl font-black text-slate-400" onClick={() => setIsCreateModalOpen(false)}>ยกเลิก</Button>
                                    <Button className="flex-1 h-16 rounded-2xl bg-slate-900 text-white font-black" onClick={handleCreateQuiz}>ตกลง สร้างเลย!</Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Results Modal */}
            <AnimatePresence>
                {isKeyModalOpen && selectedQuiz && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-4xl rounded-[3.5rem] p-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">จัดการเฉลยและผลลัพธ์</h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Quiz: {selectedQuiz.title}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" onClick={() => setIsKeyModalOpen(false)} className="rounded-full font-black text-slate-400">ปิด</Button>
                                    <Button className="rounded-2xl bg-purple-600 text-white font-black px-8 h-12" onClick={() => handleUpdateKey(selectedQuiz.answerKey)}>
                                        บันทึกเฉลย
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-4 mb-6 bg-slate-100 p-2 rounded-2xl w-fit">
                                <Button 
                                    variant={!selectedQuiz.showResults ? "default" : "ghost"}
                                    onClick={() => setSelectedQuiz({...selectedQuiz, showResults: false})}
                                    className="rounded-xl font-black"
                                >
                                    แก้ไขเฉลย
                                </Button>
                                <Button 
                                    variant={selectedQuiz.showResults ? "default" : "ghost"}
                                    onClick={() => setSelectedQuiz({...selectedQuiz, showResults: true})}
                                    className="rounded-xl font-black"
                                >
                                    ดูผลคะแนน ({selectedQuiz.results?.length || 0})
                                </Button>
                            </div>

                            <div className="flex-1 overflow-auto bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner p-6">
                                {selectedQuiz.showResults ? (
                                    <div className="space-y-4">
                                        {selectedQuiz.results?.length === 0 ? (
                                            <div className="text-center py-20 text-slate-400 font-bold italic">ยังไม่มีข้อมูลการสแกน</div>
                                        ) : (
                                            <table className="w-full text-left">
                                                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                                    <tr>
                                                        <th className="pb-4">นักเรียน / เวลา</th>
                                                        <th className="pb-4 text-center">คะแนน</th>
                                                        <th className="pb-4 text-right">การจัดการ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {selectedQuiz.results?.map((res) => (
                                                        <tr key={res.id} className="group hover:bg-white transition-colors">
                                                            <td className="py-4">
                                                                <div className="font-black text-slate-700">{res.studentName}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold">{new Date(res.scannedAt).toLocaleString()}</div>
                                                            </td>
                                                            <td className="py-4 text-center">
                                                                <span className="text-xl font-black text-purple-600">{res.score}</span>
                                                                <span className="text-xs text-slate-400 font-black">/{res.total}</span>
                                                            </td>
                                                            <td className="py-4 text-right">
                                                                {/* Potential delete button for individual result */}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                ) : (
                                    <OMRKeyEditor 
                                        questionCount={selectedQuiz.questionCount}
                                        answerKey={selectedQuiz.answerKey}
                                        onKeyChange={(newKey) => setSelectedQuiz({...selectedQuiz, answerKey: newKey})}
                                    />
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

