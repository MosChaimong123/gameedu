"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Download, Printer } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { OMRPrintableSheet } from "@/components/omr/omr-printable-sheet"

export default function OMRTemplatesPage() {
    const [selectedSize, setSelectedSize] = useState<"20" | "50" | "80">("20")

    const templates = [
        { id: "20", label: "20 Questions", icon: "📄", description: "Perfect for quick quizzes and short tests." },
        { id: "50", label: "50 Questions", icon: "📑", description: "Standard size for mid-term exams." },
        { id: "80", label: "80 Questions", icon: "📚", description: "Comprehensive for final exams and large tests." }
    ]

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard/omr">
                        <Button variant="ghost" className="w-12 h-12 rounded-full hover:bg-white shadow-sm">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">OMR Paper Templates</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Download & Print Professional Sheets</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Sidebar Selection */}
                    <div className="lg:col-span-1 space-y-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Select Size</h2>
                        {templates.map((t: any) => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedSize(t.id as any)}
                                className={`w-full p-6 rounded-[2rem] text-left transition-all border-2 flex flex-col gap-2 ${
                                    selectedSize === t.id 
                                    ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105" 
                                    : "bg-white border-white text-slate-600 hover:border-slate-200"
                                }`}
                            >
                                <span className="text-3xl">{t.icon}</span>
                                <span className="font-black text-lg leading-tight">{t.label}</span>
                                <p className={`text-[10px] font-bold leading-relaxed ${selectedSize === t.id ? "text-slate-400" : "text-slate-400"}`}>
                                    {t.description}
                                </p>
                            </button>
                        ))}
                        
                        <div className="mt-12 p-8 bg-purple-600 rounded-[2.5rem] text-white shadow-xl shadow-purple-200 relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <h3 className="font-black text-xl mb-3 relative z-10">Pro Tip 💡</h3>
                            <p className="text-xs font-bold leading-relaxed opacity-90 relative z-10">
                                Use white A4 paper and high-quality black ink for the best scanning results.
                            </p>
                        </div>
                    </div>

                    {/* Preview & Action */}
                    <div className="lg:col-span-3 flex flex-col items-center">
                        <div className="w-full bg-white rounded-[4rem] p-12 shadow-sm border border-slate-100 flex flex-col items-center min-h-[80vh]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedSize}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="w-full flex flex-col items-center"
                                >
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-black text-slate-800 mb-2">Paper Preview</h2>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">A4 Size • Standard OMR Guidelines</p>
                                    </div>

                                    <OMRPrintableSheet type={selectedSize} quizTitle="Master Template" />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
