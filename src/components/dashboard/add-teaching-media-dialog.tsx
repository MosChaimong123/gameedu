"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    FileText,
    ImageIcon,
    LinkIcon,
    Loader2,
    PlaySquare,
    Plus,
    Upload,
    Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { createTeachingMedia } from "@/lib/actions/teaching-media-actions";
import { uploadBoardFileWithProgress } from "@/lib/board-upload-client";
import { cn } from "@/lib/utils";

type MediaType = "file" | "image" | "video" | "youtube" | "link";

const MEDIA_TYPES: { id: MediaType; label: string; icon: typeof FileText }[] = [
    { id: "file", label: "ไฟล์", icon: FileText },
    { id: "image", label: "รูปภาพ", icon: ImageIcon },
    { id: "video", label: "วิดีโอ", icon: PlaySquare },
    { id: "youtube", label: "YouTube", icon: Youtube },
    { id: "link", label: "ลิงก์", icon: LinkIcon },
];

function extractYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

type AddTeachingMediaDialogProps = {
    variant?: "header" | "outline";
    className?: string;
};

export function AddTeachingMediaDialog({
    variant = "header",
    className,
}: AddTeachingMediaDialogProps) {
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [open, setOpen] = useState(false);
    const [mediaType, setMediaType] = useState<MediaType>("file");
    const [title, setTitle] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{
        percent: number;
        label: string;
    } | null>(null);

    const needsUpload = mediaType === "file" || mediaType === "image" || mediaType === "video";

    function resetForm() {
        setMediaType("file");
        setTitle("");
        setLinkUrl("");
        setYoutubeUrl("");
        setSelectedFile(null);
        setUploadProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function handleOpenChange(next: boolean) {
        if (!next && isSubmitting) return;
        setOpen(next);
        if (!next) resetForm();
    }

    function handleFileChange(file: File | null) {
        setSelectedFile(file);
        if (file && !title.trim()) {
            setTitle(file.name.replace(/\.[^.]+$/, "") || file.name);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            toast({
                variant: "destructive",
                title: "กรุณากรอกชื่อสื่อ",
                description: "ใส่ชื่อที่จำง่ายเพื่อค้นหาในคลังได้สะดวก",
            });
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(null);

        try {
            if (mediaType === "link") {
                if (!linkUrl.trim()) {
                    toast({ variant: "destructive", title: "กรุณาใส่ลิงก์" });
                    return;
                }
                await createTeachingMedia({
                    type: "link",
                    title: trimmedTitle,
                    linkUrl: linkUrl.trim(),
                    source: "media-library",
                });
            } else if (mediaType === "youtube") {
                const youtubeId = extractYoutubeId(youtubeUrl.trim());
                if (!youtubeId) {
                    toast({
                        variant: "destructive",
                        title: "ลิงก์ YouTube ไม่ถูกต้อง",
                        description: "ตัวอย่าง: https://www.youtube.com/watch?v=xxxxxxxxxxx",
                    });
                    return;
                }
                await createTeachingMedia({
                    type: "youtube",
                    title: trimmedTitle,
                    youtubeId,
                    source: "media-library",
                });
            } else {
                if (!selectedFile) {
                    toast({ variant: "destructive", title: "กรุณาเลือกไฟล์" });
                    return;
                }

                setUploadProgress({ percent: 0, label: "กำลังอัปโหลดไฟล์..." });
                const uploadRes = await uploadBoardFileWithProgress(selectedFile, {
                    onByteProgress: ({ percent }) => {
                        setUploadProgress({
                            percent,
                            label: "กำลังอัปโหลดไฟล์...",
                        });
                    },
                });

                setUploadProgress({ percent: 100, label: "กำลังบันทึกในคลัง..." });
                const mime = uploadRes.type ?? selectedFile.type;
                const resolvedType: MediaType =
                    mediaType === "image"
                        ? "image"
                        : mediaType === "video"
                          ? "video"
                          : mime.startsWith("image/")
                            ? "image"
                            : mime.startsWith("video/")
                              ? "video"
                              : "file";

                await createTeachingMedia({
                    type: resolvedType,
                    title: trimmedTitle,
                    url: uploadRes.url,
                    name: uploadRes.originalFileName ?? uploadRes.fileName ?? selectedFile.name,
                    mimeType: mime,
                    size: uploadRes.size ?? selectedFile.size,
                    source: "media-library",
                });
            }

            toast({
                title: "เพิ่มสื่อในคลังแล้ว",
                description: trimmedTitle,
            });
            handleOpenChange(false);
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "ไม่สามารถเพิ่มสื่อได้";
            toast({
                variant: "destructive",
                title: "เพิ่มสื่อไม่สำเร็จ",
                description: message,
            });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(null);
        }
    }

    const acceptByType =
        mediaType === "image"
            ? "image/*"
            : mediaType === "video"
              ? "video/*"
              : undefined;

    return (
        <>
            <Button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                    variant === "header"
                        ? "inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                        : "gap-2 rounded-2xl font-black",
                    className
                )}
                variant={variant === "outline" ? "outline" : undefined}
            >
                <Plus className="h-4 w-4" />
                เพิ่มสื่อ
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-lg rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">เพิ่มสื่อในคลัง</DialogTitle>
                        <p className="text-sm text-slate-500">
                            อัปโหลดหรือบันทึกลิงก์ เพื่อให้หยิบกลับไปใช้ซ้ำในกระดานชั้นเรียนได้ทันที
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {MEDIA_TYPES.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => {
                                        setMediaType(id);
                                        setSelectedFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition",
                                        mediaType === id
                                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="media-title">ชื่อสื่อ</Label>
                            <Input
                                id="media-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="เช่น ใบงานหน่วยที่ 1"
                                maxLength={180}
                            />
                        </div>

                        {mediaType === "link" && (
                            <div className="space-y-2">
                                <Label htmlFor="media-link">ลิงก์</Label>
                                <Input
                                    id="media-link"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://..."
                                    type="url"
                                />
                            </div>
                        )}

                        {mediaType === "youtube" && (
                            <div className="space-y-2">
                                <Label htmlFor="media-youtube">ลิงก์ YouTube</Label>
                                <Input
                                    id="media-youtube"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    type="url"
                                />
                            </div>
                        )}

                        {needsUpload && (
                            <div className="space-y-2">
                                <Label>ไฟล์</Label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={acceptByType}
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center transition hover:border-indigo-200 hover:bg-indigo-50/40"
                                >
                                    <Upload className="h-6 w-6 text-indigo-500" />
                                    <span className="text-sm font-bold text-slate-700">
                                        {selectedFile ? selectedFile.name : "เลือกไฟล์จากเครื่อง"}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {mediaType === "image"
                                            ? "รองรับรูปภาพ"
                                            : mediaType === "video"
                                              ? "รองรับวิดีโอ"
                                              : "รองรับไฟล์เอกสารและไฟล์ประกอบการสอน"}
                                    </span>
                                </button>
                            </div>
                        )}

                        {uploadProgress && (
                            <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-3">
                                <div className="flex items-center justify-between gap-2 text-xs font-bold text-indigo-900">
                                    <span>{uploadProgress.label}</span>
                                    <span className="tabular-nums">{uploadProgress.percent}%</span>
                                </div>
                                <Progress
                                    value={uploadProgress.percent}
                                    className="h-2.5 bg-indigo-100"
                                    indicatorClassName="bg-indigo-600 transition-all duration-150"
                                />
                                {selectedFile && (
                                    <p className="truncate text-[10px] font-medium text-indigo-700/80">
                                        {selectedFile.name}
                                    </p>
                                )}
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="font-black">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {uploadProgress
                                            ? `${uploadProgress.label} ${uploadProgress.percent}%`
                                            : "กำลังบันทึก..."}
                                    </>
                                ) : (
                                    "บันทึกในคลัง"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
