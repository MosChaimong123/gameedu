"use client"

import { motion } from "framer-motion"

interface OMRKeyEditorProps {
    questionCount: number
    answerKey: Record<string, string>
    onKeyChange: (newKey: Record<string, string>) => void
}

export function OMRKeyEditor({ questionCount, answerKey, onKeyChange }: OMRKeyEditorProps) {
    const handleSetAnswer = (qNum: string, answer: string) => {
        const newKey = { ...answerKey, [qNum]: answer }
        onKeyChange(newKey)
    }

    const colCount = questionCount <= 20 ? 2 : questionCount <= 50 ? 3 : 4
    const questionsPerCol = Math.ceil(questionCount / colCount)
    const options = ["A", "B", "C", "D", "E"] // Consistent with OMR Template

    return (
        <div className="flex flex-col md:flex-row gap-8 max-h-[60vh] overflow-y-auto p-10 bg-slate-50/50 rounded-[3.5rem] border-2 border-slate-100/80 shadow-inner">
            {Array.from({ length: colCount }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1 flex flex-col gap-4">
                    {Array.from({ length: questionsPerCol }).map((_, qIndex) => {
                        const qNum = colIndex * questionsPerCol + qIndex + 1
                        if (qNum > questionCount) return null
                        const q = qNum.toString()
                        
                        return (
                            <motion.div 
                                key={q}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: qNum * 0.01 }}
                                className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-purple-200 transition-all hover:shadow-md"
                            >
                                <div className="flex flex-col min-w-10">
                                    <span className="font-black text-slate-300 text-[10px] uppercase tracking-tighter leading-none mb-1">Q-Num</span>
                                    <span className="font-black text-slate-800 text-lg leading-none">#{q}</span>
                                </div>
                                <div className="flex gap-1">
                                    {options.map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => handleSetAnswer(q, opt)}
                                            className={`w-9 h-9 rounded-full font-black text-xs transition-all transform active:scale-90 border-2 ${
                                                answerKey[q] === opt
                                                    ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200 scale-105 z-10"
                                                    : "bg-white text-slate-400 border-slate-100 hover:border-purple-100 hover:bg-purple-50"
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
