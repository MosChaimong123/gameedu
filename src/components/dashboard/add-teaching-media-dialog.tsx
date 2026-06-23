"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    FileText,
    ImageIcon,
    LinkIcon,
    Loader2,
    PlaySquare,
    Plus,
    Upload,
    X,
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
import {
    createTeachingMedia,
    type TeachingMediaTagSuggestion,
} from "@/lib/actions/teaching-media-actions";
import { uploadBoardFilesParallel } from "@/lib/board-upload-client";
import { cn } from "@/lib/utils";

type MediaType = "file" | "image" | "video" | "youtube" | "link";

type UploadDraftFile = {
    file: File;
    title: string;
    tagsInput: string;
};

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

function getDefaultTitleFromFile(file: File) {
    return file.name.replace(/\.[^.]+$/, "") || file.name;
}

function formatFileSize(size: number) {
    const mb = size / 1024 / 1024;
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function normalizeTagsInput(value: string) {
    return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
}

type AddTeachingMediaDialogProps = {
    variant?: "header" | "outline";
    className?: string;
    tagSuggestions?: TeachingMediaTagSuggestion[];
};

export function AddTeachingMediaDialog({
    variant = "header",
    className,
    tagSuggestions = [],
}: AddTeachingMediaDialogProps) {
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [open, setOpen] = useState(false);
    const [mediaType, setMediaType] = useState<MediaType>("file");
    const [title, setTitle] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<UploadDraftFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{
        percent: number;
        label: string;
        current?: number;
        total?: number;
        fileName?: string;
    } | null>(null);

    const needsUpload = mediaType === "file" || mediaType === "image" || mediaType === "video";

    function resetForm() {
        setMediaType("file");
        setTitle("");
        setLinkUrl("");
        setYoutubeUrl("");
        setSelectedFiles([]);
        setUploadProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function handleOpenChange(next: boolean) {
        if (!next && isSubmitting) return;
        setOpen(next);
        if (!next) resetForm();
    }

    function handleFileChange(fileList: FileList | null) {
        const nextFiles = fileList ? Array.from(fileList) : [];
        setSelectedFiles(
            nextFiles.map((file) => ({
                file,
                title: getDefaultTitleFromFile(file),
                tagsInput: "",
            }))
        );
    }

    function removeSelectedFile(index: number) {
        setSelectedFiles((current) => {
            const next = current.filter((_, itemIndex) => itemIndex !== index);
            if (next.length === 0 && fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return next;
        });
    }

    function updateSelectedFile(index: number, patch: Partial<UploadDraftFile>) {
        setSelectedFiles((current) =>
            current.map((entry, itemIndex) => (itemIndex === index ? { ...entry, ...patch } : entry))
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmedTitle = title.trim();

        if (!needsUpload && !trimmedTitle) {
            toast({
                variant: "destructive",
                title: "กรุณากรอกชื่อสื่อ",
                description: "ใส่ชื่อที่จำง่ายเพื่อค้นหาในคลังได้สะดวก",
            });
            return;
        }

        if (needsUpload) {
            const invalidFile = selectedFiles.find((entry) => !entry.title.trim());
            if (invalidFile) {
                toast({
                    variant: "destructive",
                    title: "กรุณาตั้งชื่อไฟล์ให้ครบ",
                    description: `ไฟล์ ${invalidFile.file.name} ยังไม่มีชื่อสำหรับบันทึกเข้าคลัง`,
                });
                return;
            }
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
                if (selectedFiles.length === 0) {
                    toast({ variant: "destructive", title: "กรุณาเลือกไฟล์" });
                    return;
                }

                setUploadProgress({
                    percent: 0,
                    label:
                        selectedFiles.length > 1
                            ? "กำลังอัปโหลดชุดไฟล์..."
                            : "กำลังอัปโหลดไฟล์...",
                    current: 0,
                    total: selectedFiles.length,
                });

                const uploadResults = await uploadBoardFilesParallel(
                    selectedFiles.map((entry) => entry.file),
                    {
                        onProgress: ({ current, total, fileName }) => {
                            setUploadProgress({
                                percent: total > 0 ? Math.round(((current - 1) / total) * 100) : 0,
                                label: "กำลังอัปโหลดชุดไฟล์...",
                                current,
                                total,
                                fileName,
                            });
                        },
                    }
                );

                setUploadProgress({
                    percent: 100,
                    label: "กำลังบันทึกเข้าคลัง...",
                    current: selectedFiles.length,
                    total: selectedFiles.length,
                });

                await Promise.all(
                    uploadResults.map((uploadRes, index) => {
                        const entry = selectedFiles[index]!;
                        const file = entry.file;
                        const mime = uploadRes.type ?? file.type;
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

                        return createTeachingMedia({
                            type: resolvedType,
                            title: entry.title.trim(),
                            tags: normalizeTagsInput(entry.tagsInput),
                            url: uploadRes.url,
                            name: uploadRes.originalFileName ?? uploadRes.fileName ?? file.name,
                            mimeType: mime,
                            size: uploadRes.size ?? file.size,
                            source: "media-library",
                        });
                    })
                );
            }

            toast({
                title: "เพิ่มสื่อในคลังแล้ว",
                description: needsUpload
                    ? selectedFiles.length > 1
                        ? `บันทึก ${selectedFiles.length} ไฟล์เรียบร้อย`
                        : selectedFiles[0]?.file.name ?? trimmedTitle
                    : trimmedTitle,
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
                <DialogContent className="max-w-2xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">เพิ่มสื่อในคลัง</DialogTitle>
                        <p className="text-sm text-slate-500">
                            อัปโหลดหรือบันทึกลิงก์ เพื่อให้หยิบกลับไปใช้ซ้ำในกระดานชั้นเรียน บทเรียน และงานได้ทันที
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
                                        setSelectedFiles([]);
                                        setUploadProgress(null);
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

                        {!needsUpload ? (
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
                        ) : null}

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

                        {needsUpload ? (
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>ไฟล์</Label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={acceptByType}
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e.target.files)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center transition hover:border-indigo-200 hover:bg-indigo-50/40"
                                    >
                                        <Upload className="h-6 w-6 text-indigo-500" />
                                        <span className="text-sm font-bold text-slate-700">
                                            {selectedFiles.length === 0
                                                ? "เลือกไฟล์จากเครื่อง"
                                                : selectedFiles.length === 1
                                                  ? selectedFiles[0]!.file.name
                                                  : `เลือกแล้ว ${selectedFiles.length} ไฟล์`}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {mediaType === "image"
                                                ? "รองรับรูปภาพหลายไฟล์"
                                                : mediaType === "video"
                                                  ? "รองรับวิดีโอหลายไฟล์"
                                                  : "รองรับไฟล์เอกสารและไฟล์ประกอบการสอนหลายไฟล์พร้อมกัน"}
                                        </span>
                                    </button>
                                </div>

                                {selectedFiles.length > 0 ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-black text-slate-700">ตั้งค่ารายไฟล์ก่อนบันทึก</p>
                                                <p className="text-[11px] text-slate-400">
                                                    ตั้งชื่อและแท็กของแต่ละไฟล์ได้ก่อนเข้าคลัง
                                                </p>
                                            </div>
                                            <p className="text-[11px] font-medium text-slate-400">
                                                {selectedFiles.length} ไฟล์
                                            </p>
                                        </div>

                                        <datalist id="media-upload-tag-suggestions">
                                            {tagSuggestions.map((suggestion) => (
                                                <option key={suggestion.tag} value={suggestion.tag} />
                                            ))}
                                        </datalist>

                                        <div className="max-h-[26rem] space-y-3 overflow-y-auto">
                                            {selectedFiles.map((entry, index) => (
                                                <div
                                                    key={`${entry.file.name}-${entry.file.size}-${index}`}
                                                    className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                                                >
                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-700">
                                                                {entry.file.name}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400">
                                                                {formatFileSize(entry.file.size)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSelectedFile(index)}
                                                            disabled={isSubmitting}
                                                            className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-rose-500 disabled:opacity-50"
                                                            aria-label={`ลบไฟล์ ${entry.file.name}`}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor={`media-title-${index}`}>ชื่อรายการ</Label>
                                                            <Input
                                                                id={`media-title-${index}`}
                                                                value={entry.title}
                                                                onChange={(e) =>
                                                                    updateSelectedFile(index, {
                                                                        title: e.target.value,
                                                                    })
                                                                }
                                                                placeholder="ชื่อสื่อในคลัง"
                                                                maxLength={180}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor={`media-tags-${index}`}>แท็ก</Label>
                                                            <Input
                                                                id={`media-tags-${index}`}
                                                                value={entry.tagsInput}
                                                                onChange={(e) =>
                                                                    updateSelectedFile(index, {
                                                                        tagsInput: e.target.value,
                                                                    })
                                                                }
                                                                list="media-upload-tag-suggestions"
                                                                placeholder="คณิตศาสตร์, ใบงาน"
                                                                maxLength={240}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {uploadProgress ? (
                            <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-3">
                                <div className="flex items-center justify-between gap-2 text-xs font-bold text-indigo-900">
                                    <span>{uploadProgress.label}</span>
                                    <span className="tabular-nums">{uploadProgress.percent}%</span>
                                </div>
                                {uploadProgress.total ? (
                                    <div className="flex items-center justify-between gap-2 text-[11px] text-indigo-700/80">
                                        <span>
                                            {uploadProgress.current ?? 0}/{uploadProgress.total} ไฟล์
                                        </span>
                                        {uploadProgress.fileName ? (
                                            <span className="truncate text-right">{uploadProgress.fileName}</span>
                                        ) : null}
                                    </div>
                                ) : null}
                                <Progress
                                    value={uploadProgress.percent}
                                    className="h-2.5 bg-indigo-100"
                                    indicatorClassName="bg-indigo-600 transition-all duration-150"
                                />
                                {uploadProgress.percent === 100 && selectedFiles.length > 0 ? (
                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        พร้อมบันทึกเข้าคลัง {selectedFiles.length} ไฟล์
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

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
