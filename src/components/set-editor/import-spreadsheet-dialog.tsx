"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"
import { FileText, Upload, AlertCircle, FileSpreadsheet, CheckCircle2 } from "lucide-react"
import Papa from "papaparse"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (questions: any[]) => void
}

export function ImportSpreadsheetDialog({ open, onOpenChange, onImport }: Props) {
    const { t, language } = useLanguage()
    const [isDragging, setIsDragging] = useState(false)
    const [parsedData, setParsedData] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFile = (file: File) => {
        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            setError(t("pleaseUploadCsv"))
            return
        }
        setError(null)

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const { data, meta } = results
                // Basic validation: Check for required columns (English OR Thai)
                const headers = meta.fields || []

                const enRequired = ["Question Text", "Correct Answer"]
                const thRequired = ["คำถาม", "คำตอบที่ถูกต้อง"]

                const hasEn = enRequired.every(f => headers.includes(f))
                const hasTh = thRequired.every(f => headers.includes(f))

                if (!hasEn && !hasTh) {
                    setError(t("missingColumns").replace("{columns}", language === 'th' ? thRequired.join(", ") : enRequired.join(", ")))
                    setParsedData([])
                    return
                }

                // Transform to our Question format
                const questions = data.map((row: any) => {
                    // Normalize keys
                    const qText = row["Question Text"] || row["คำถาม"]
                    const correctTags = row["Correct Answer"] || row["คำตอบที่ถูกต้อง"]
                    const timeTags = row["Time Limit"] || row["เวลา (วินาที)"]
                    const opt2 = row["Option 2"] || row["ตัวเลือก 2"]
                    const opt3 = row["Option 3"] || row["ตัวเลือก 3"]
                    const opt4 = row["Option 4"] || row["ตัวเลือก 4"]

                    const options = [
                        correctTags,
                        opt2,
                        opt3,
                        opt4
                    ].filter(opt => opt && opt.toString().trim() !== "")

                    return {
                        id: crypto.randomUUID(),
                        question: qText || "",
                        timeLimit: parseInt(timeTags) || 30, // Default 30s
                        options: options,
                        answers: [correctTags],
                        questionType: "MULTIPLE_CHOICE",
                    }
                }).filter(q => q.question && q.answers.length > 0)

                if (questions.length === 0) {
                    setError(t("noValidQuestions"))
                } else {
                    setParsedData(questions)
                }
            },
            error: (err) => {
                setError(t("csvParseError").replace("{error}", err.message))
            }
        })
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const downloadTemplate = () => {
        let csvContent = ""
        if (language === 'th') {
            csvContent = "คำถาม,เวลา (วินาที),คำตอบที่ถูกต้อง,ตัวเลือก 2,ตัวเลือก 3,ตัวเลือก 4\nตัวอย่างคำถาม?,30,คำตอบถูก,ผิด 1,ผิด 2,ผิด 3"
        } else {
            csvContent = "Question Text,Time Limit,Correct Answer,Option 2,Option 3,Option 4\nExample Question?,30,Correct Answer,Wrong 1,Wrong 2,Wrong 3"
        }

        // Add BOM for Excel UTF-8 support
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", "question_template.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleConfirm = () => {
        onImport(parsedData)
        setParsedData([])
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-white max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                        {t("importSpreadsheetTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("importDescription")} <button onClick={downloadTemplate} className="text-purple-600 underline font-semibold hover:text-purple-700">{t("downloadTemplate")}</button>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {parsedData.length === 0 ? (
                        <div
                            className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? "border-purple-500 bg-purple-50" : "border-slate-300 hover:border-purple-400 hover:bg-slate-50"
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                            <div className="bg-emerald-100 p-4 rounded-full mb-4">
                                <Upload className="w-8 h-8 text-emerald-600" />
                            </div>
                            <p className="text-lg font-semibold text-slate-700">{t("dragDropCsv")}</p>
                            <p className="text-sm text-slate-500 mt-2">{t("supportsCsv")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {t("foundQuestions").replace("{count}", parsedData.length.toString())}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setParsedData([])} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    {t("clearAndUploadNew")}
                                </Button>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">{t("question")}</TableHead>
                                            <TableHead>{t("correctAnswer")}</TableHead>
                                            <TableHead>{t("time")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedData.slice(0, 5).map((q, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium truncate max-w-[200px]" title={q.question}>{q.question}</TableCell>
                                                <TableCell className="text-emerald-600 font-medium truncate max-w-[150px]" title={q.answers[0]}>{q.answers[0]}</TableCell>
                                                <TableCell>{q.timeLimit}</TableCell>
                                            </TableRow>
                                        ))}
                                        {parsedData.length > 5 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-slate-500 italic">
                                                    ...and {parsedData.length - 5} more
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t("error")}</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
                    <Button onClick={handleConfirm} disabled={parsedData.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
                        {t("importCount").replace("{count}", parsedData.length.toString())}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
