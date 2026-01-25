"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Image as ImageIcon, Upload, Link as LinkIcon, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

interface ImageUploadProps {
    value?: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
    const { t } = useLanguage()
    const [isDragOver, setIsDragOver] = useState(false)
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            processFile(file)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            processFile(file)
        }
    }

    const processFile = (file: File) => {
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file")
            return
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert("Image size should be less than 2MB")
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            const result = reader.result as string
            onChange(result)
        }
        reader.readAsDataURL(file)
    }

    const handleLinkSubmit = () => {
        if (linkUrl) {
            onChange(linkUrl)
            setIsLinkDialogOpen(false)
            setLinkUrl("")
        }
    }

    const clearImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange("")
    }

    return (
        <>
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-4 transition-colors overflow-hidden group min-h-[200px] flex flex-col items-center justify-center text-center bg-white",
                    isDragOver ? "border-purple-500 bg-purple-50" : "border-slate-300 hover:border-purple-400",
                    value ? "border-solid border-slate-200 p-0" : ""
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                />

                {value ? (
                    <div className="relative w-full h-full min-h-[200px] bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={value}
                            alt="Cover"
                            className="w-full h-full object-contain max-h-[300px]"
                        />
                        <div className="absolute top-2 right-2">
                            <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={clearImage}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <span className="text-lg font-bold text-slate-700">{t("coverImage")}</span>
                        <span className="text-sm text-slate-400">{t("dragDropOr")}</span>

                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="bg-white hover:bg-slate-50"
                                onClick={() => document.getElementById('gallery-trigger')?.click()}
                            >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                {t("imageGallery")}
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="bg-white hover:bg-slate-50"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {t("uploadFile")}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="bg-white hover:bg-slate-50"
                                onClick={() => setIsLinkDialogOpen(true)}
                            >
                                <LinkIcon className="mr-2 h-4 w-4" />
                                {t("uploadUrl")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("uploadUrl")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Image URL</Label>
                            <Input
                                placeholder="https://example.com/image.png"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleLinkSubmit}>Import</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
