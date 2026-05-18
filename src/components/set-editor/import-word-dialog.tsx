"use client"

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"
import { Upload, AlertCircle, FileType, CheckCircle2, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { buildWordTemplateDocxBlob } from "@/lib/set-editor/build-word-template-docx"
import type { ImportedQuestionDraft } from "@/lib/set-editor/question-import"
import { isSupportedWordImportFile, parseQuestionsFromWordFile } from "@/lib/set-editor/parse-word-document"
import {
    isZipParseErrorMessage,
    WORD_IMPORT_ERROR_TRANSLATION_KEYS,
    WordImportError,
} from "@/lib/set-editor/word-import-errors"
import {
    getCsvMissingColumnsMessage,
    getCsvNoValidQuestionsMessage,
    getCsvParseErrorMessage,
} from "@/lib/set-editor-messages"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (questions: ImportedQuestionDraft[]) => void
}

export function ImportWordDialog({ open, onOpenChange, onImport }: Props) {
    const { t, language } = useLanguage()
    const importLanguage = language === "th" ? "th" : "en"
    const [isDragging, setIsDragging] = useState(false)
    const [parsedData, setParsedData] = useState<ImportedQuestionDraft[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isParsing, setIsParsing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFile = async (file: File) => {
        if (!isSupportedWordImportFile(file)) {
            setError(t("pleaseUploadWordFile"))
            return;
        }

        setError(null)
        setIsParsing(true)

        try {
            const questions = await parseQuestionsFromWordFile(file, importLanguage)
            if (questions.length === 0) {
                setParsedData([])
                setError(getCsvMissingColumnsMessage(importLanguage, t("wordMissingFormat")))
            } else {
                setParsedData(questions)
            }
        } catch (err) {
            if (err instanceof WordImportError) {
                setError(t(WORD_IMPORT_ERROR_TRANSLATION_KEYS[err.code]))
            } else {
                const message = err instanceof Error ? err.message : String(err)
                if (isZipParseErrorMessage(message)) {
                    setError(t("wordCorruptDocxHint"))
                } else {
                    setError(getCsvParseErrorMessage(t("wordParseError"), message))
                }
            }
            setParsedData([])
        } finally {
            setIsParsing(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files?.[0]) {
            void handleFile(e.dataTransfer.files[0])
        }
    }

    const downloadTemplate = async () => {
        const blob = await buildWordTemplateDocxBlob(importLanguage)
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", t("wordTemplateDownloadFilename"))
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
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
                        <FileType className="w-6 h-6 text-blue-600" />
                        {t("importWordTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("importWordDescription")}{" "}
                        <button
                            type="button"
                            onClick={() => void downloadTemplate()}
                            className="text-purple-600 underline font-semibold hover:text-purple-700"
                        >
                            {t("downloadWordTemplate")}
                        </button>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {parsedData.length === 0 ? (
                        <div
                            className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? "border-purple-500 bg-purple-50" : "border-slate-300 hover:border-purple-400 hover:bg-slate-50"
                                } ${isParsing ? "pointer-events-none opacity-70" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
                            />
                            <div className="bg-blue-100 p-4 rounded-full mb-4">
                                {isParsing ? (
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                ) : (
                                    <Upload className="w-8 h-8 text-blue-600" />
                                )}
                            </div>
                            <p className="text-lg font-semibold text-slate-700">{t("dragDropWord")}</p>
                            <p className="text-sm text-slate-500 mt-2">{t("supportsWordFile")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 text-blue-700 font-medium">
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
                    <Button onClick={handleConfirm} disabled={parsedData.length === 0 || isParsing} className="bg-blue-600 hover:bg-blue-700">
                        {t("importCount").replace("{count}", parsedData.length.toString())}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
