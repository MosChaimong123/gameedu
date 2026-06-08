"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Archive,
    ExternalLink,
    Check,
    Copy,
    Download,
    FileText,
    ImageIcon,
    LinkIcon,
    Loader2,
    MoreHorizontal,
    Pencil,
    PlaySquare,
    Star,
    RotateCcw,
    Search,
    Tags,
    Trash2,
    Youtube,
    X,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    bulkArchiveTeachingMedia,
    bulkRestoreTeachingMedia,
    bulkUpdateTeachingMediaTags,
    deleteTeachingMedia,
    restoreTeachingMedia,
    toggleTeachingMediaFavorite,
    updateTeachingMedia,
} from "@/lib/actions/teaching-media-actions";
import type { TeachingMediaItem, TeachingMediaSort, TeachingMediaTagSuggestion } from "@/lib/actions/teaching-media-actions";
import { cn } from "@/lib/utils";

const TYPE_FILTERS = [
    { value: "", label: "ทั้งหมด" },
    { value: "file", label: "ไฟล์" },
    { value: "image", label: "รูปภาพ" },
    { value: "video", label: "วิดีโอ" },
    { value: "youtube", label: "YouTube" },
    { value: "link", label: "ลิงก์" },
] as const;

const SORT_OPTIONS = [
    { value: "newest", label: "ใหม่สุด" },
    { value: "oldest", label: "เก่าสุด" },
    { value: "name_asc", label: "ชื่อ A-Z" },
    { value: "size_desc", label: "ขนาดไฟล์" },
] as const;

const ARCHIVE_FILTERS = [
    { value: "active", label: "ใช้งานอยู่" },
    { value: "archived", label: "เก็บถาวร" },
    { value: "all", label: "ทั้งหมด" },
] as const;

type SortOption = TeachingMediaSort;
type ArchiveFilter = (typeof ARCHIVE_FILTERS)[number]["value"];

const TYPE_LABEL: Record<string, string> = {
    file: "ไฟล์",
    image: "รูปภาพ",
    video: "วิดีโอ",
    youtube: "YouTube",
    link: "ลิงก์",
};

function MediaIcon({ type, className }: { type: string; className?: string }) {
    const cls = cn("h-5 w-5", className);
    if (type === "image") return <ImageIcon className={cls} />;
    if (type === "video") return <PlaySquare className={cls} />;
    if (type === "youtube") return <Youtube className={cls} />;
    if (type === "link") return <LinkIcon className={cls} />;
    return <FileText className={cls} />;
}

function getMediaUrl(item: TeachingMediaItem): string | null {
    if (item.url) return item.url;
    if (item.linkUrl) return item.linkUrl;
    if (item.youtubeId) return `https://www.youtube.com/watch?v=${item.youtubeId}`;
    return null;
}

function isDownloadable(item: TeachingMediaItem) {
    return (item.type === "file" || item.type === "image" || item.type === "video") && !!item.url;
}

function formatFileSize(size: number | null) {
    if (!size) return null;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatLastUsedAt(value: Date | string | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function canPreviewInFrame(item: TeachingMediaItem) {
    if (item.type === "image" || item.type === "video" || item.type === "youtube" || item.type === "link") {
        return true;
    }
    return item.mimeType?.includes("pdf") ?? false;
}

function getYoutubeEmbedUrl(item: TeachingMediaItem) {
    if (!item.youtubeId) return null;
    return `https://www.youtube.com/embed/${item.youtubeId}`;
}

function PreviewModal({
    item,
    open,
    onOpenChange,
}: {
    item: TeachingMediaItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [copied, setCopied] = useState(false);
    const mediaUrl = item ? getMediaUrl(item) : null;

    async function handleCopy() {
        if (!mediaUrl) return;
        await navigator.clipboard.writeText(mediaUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (!item) return null;

    const youtubeEmbedUrl = getYoutubeEmbedUrl(item);
    const previewFileInFrame = item.type === "file" && canPreviewInFrame(item) && item.url;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-[2rem] border-0 bg-white p-0 shadow-2xl">
                <div className="flex max-h-[90vh] flex-col">
                    <DialogHeader className="border-b border-slate-100 px-6 py-5">
                        <DialogTitle className="flex items-center gap-3 text-xl font-black text-slate-900">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <MediaIcon type={item.type} />
                            </span>
                            <span className="min-w-0 truncate">{item.title}</span>
                        </DialogTitle>
                        <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                            <span>{TYPE_LABEL[item.type] ?? item.type}</span>
                            {item.name ? <span>• {item.name}</span> : null}
                            {item.size ? <span>• {formatFileSize(item.size)}</span> : null}
                            {item.usageCount > 0 ? <span>• ใช้งานแล้ว {item.usageCount} ครั้ง</span> : null}
                            {item.lastUsedAt ? <span>• ใช้ล่าสุด {formatLastUsedAt(item.lastUsedAt)}</span> : null}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="overflow-y-auto px-6 py-5">
                        <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-950/95 shadow-inner">
                            {item.type === "image" && item.url ? (
                                <div className="flex min-h-[24rem] items-center justify-center bg-slate-950 p-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={item.url}
                                        alt={item.title}
                                        className="max-h-[70vh] max-w-full rounded-2xl object-contain"
                                    />
                                </div>
                            ) : null}

                            {item.type === "video" && item.url ? (
                                <div className="bg-black p-4">
                                    <video
                                        controls
                                        preload="metadata"
                                        src={item.url}
                                        className="max-h-[70vh] w-full rounded-2xl bg-black"
                                    />
                                </div>
                            ) : null}

                            {item.type === "youtube" && youtubeEmbedUrl ? (
                                <div className="aspect-video w-full bg-black">
                                    <iframe
                                        src={youtubeEmbedUrl}
                                        title={item.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="h-full w-full"
                                    />
                                </div>
                            ) : null}

                            {previewFileInFrame ? (
                                <div className="h-[70vh] w-full bg-white">
                                    <iframe src={item.url!} title={item.title} className="h-full w-full" />
                                </div>
                            ) : null}

                            {item.type === "link" && item.linkUrl ? (
                                <div className="space-y-4 bg-white p-6">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-sm font-black text-slate-800">ลิงก์ปลายทาง</p>
                                        <p className="mt-2 break-all text-sm text-slate-600">{item.linkUrl}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                            รายละเอียด
                                        </p>
                                        <p className="mt-2 text-sm text-slate-600">
                                            {item.description?.trim() || "ยังไม่มีคำอธิบายสำหรับลิงก์นี้"}
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            {item.type === "file" && !previewFileInFrame ? (
                                <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-500 shadow-sm">
                                        <FileText className="h-8 w-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-lg font-black text-slate-800">{item.name || item.title}</p>
                                        <p className="max-w-lg text-sm text-slate-500">
                                            ไฟล์ประเภทนี้ยังไม่รองรับการพรีวิวในหน้าโดยตรง แต่สามารถดาวน์โหลดหรือเปิดในแท็บใหม่ได้ทันที
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {item.tags.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {item.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter className="border-t border-slate-100 px-6 py-4">
                        {mediaUrl ? (
                            <button
                                type="button"
                                onClick={() => void handleCopy()}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                            >
                                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                {copied ? "คัดลอกแล้ว" : "คัดลอก URL"}
                            </button>
                        ) : null}

                        {isDownloadable(item) && item.url ? (
                            <a
                                href={item.url}
                                download={item.name ?? true}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                            >
                                <Download className="h-4 w-4" />
                                ดาวน์โหลด
                            </a>
                        ) : null}

                        {mediaUrl ? (
                            <a
                                href={mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700"
                            >
                                <ExternalLink className="h-4 w-4" />
                                เปิดในแท็บใหม่
                            </a>
                        ) : null}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function EditDialog({
    item,
    onClose,
    onSaved,
    tagSuggestions,
}: {
    item: TeachingMediaItem;
    onClose: () => void;
    onSaved: (updated: TeachingMediaItem) => void;
    tagSuggestions: TeachingMediaTagSuggestion[];
}) {
    const [title, setTitle] = useState(item.title);
    const [tagsInput, setTagsInput] = useState(item.tags.join(", "));
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleSave() {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setError("กรุณาใส่ชื่อสื่อ");
            return;
        }

        const tags = tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 12);

        setError(null);
        startTransition(async () => {
            try {
                const updated = await updateTeachingMedia(item.id, { title: trimmedTitle, tags });
                onSaved(updated);
            } catch {
                setError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
            }
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="font-black text-slate-800">แก้ไขสื่อ</h2>
                    <button type="button" onClick={onClose} className="rounded-xl p-1.5 hover:bg-slate-100">
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-5">
                    <div>
                        <label className="mb-1.5 block text-xs font-black text-slate-600">ชื่อสื่อ *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            maxLength={180}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <datalist id={`media-tag-suggestions-${item.id}`}>
                            {tagSuggestions.map((suggestion) => (
                                <option key={suggestion.tag} value={suggestion.tag} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-black text-slate-600">
                            แท็ก <span className="font-normal text-slate-400">(คั่นด้วยจุลภาค, สูงสุด 12)</span>
                        </label>
                        <input
                            type="text"
                            value={tagsInput}
                            onChange={(event) => setTagsInput(event.target.value)}
                            list={`media-tag-suggestions-${item.id}`}
                            placeholder="คณิตศาสตร์, ป.5, แบบฝึกหัด"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                    {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={pending}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

function KebabMenu({
    item,
    onEdit,
    onDelete,
    onRestore,
}: {
    item: TeachingMediaItem;
    onEdit: () => void;
    onDelete: () => void;
    onRestore: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuUrl = getMediaUrl(item);

    function handleCopy() {
        if (!menuUrl) return;
        navigator.clipboard.writeText(menuUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
        setOpen(false);
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((value) => !value);
                }}
                className="rounded-lg p-1 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100"
            >
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </button>

            {open ? (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-7 z-40 min-w-[10rem] rounded-2xl border border-slate-100 bg-white py-1.5 shadow-lg">
                        {menuUrl ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleCopy();
                                }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                    <Copy className="h-4 w-4 text-slate-400" />
                                )}
                                {copied ? "คัดลอกแล้ว" : "คัดลอก URL"}
                            </button>
                        ) : null}

                        {isDownloadable(item) && item.url ? (
                            <a
                                href={item.url}
                                download={item.name ?? true}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setOpen(false);
                                }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                <Download className="h-4 w-4 text-slate-400" />
                                ดาวน์โหลด
                            </a>
                        ) : null}

                        {!item.isArchived ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setOpen(false);
                                    onEdit();
                                }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                <Pencil className="h-4 w-4 text-slate-400" />
                                แก้ไข
                            </button>
                        ) : null}

                        {item.isArchived ? (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setOpen(false);
                                    onRestore();
                                }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
                            >
                                <RotateCcw className="h-4 w-4 text-emerald-500" />
                                กู้คืน
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setOpen(false);
                                    onDelete();
                                }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                เก็บถาวร
                            </button>
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
}

function DeleteConfirm({
    item,
    onClose,
    onDeleted,
}: {
    item: TeachingMediaItem;
    onClose: () => void;
    onDeleted: (id: string) => void;
}) {
    const [pending, startTransition] = useTransition();

    function handleDelete() {
        startTransition(async () => {
            try {
                await deleteTeachingMedia(item.id);
                onDeleted(item.id);
            } catch {
                onClose();
            }
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <Trash2 className="h-6 w-6" />
                </div>
                <h2 className="font-black text-slate-800">เก็บสื่อนี้เข้าคลังถาวร?</h2>
                <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">&ldquo;{item.title}&rdquo;</p>
                <p className="mt-2 text-xs text-slate-400">สื่อจะหายจากรายการใช้งานอยู่ แต่ยังสามารถกู้คืนได้ภายหลัง</p>
                {item.boardUsageCount > 0 ? (
                    <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                        สื่อนี้ถูกใช้ในโพสต์กระดานอย่างน้อย {item.boardUsageCount} ครั้ง ควรเก็บถาวรแทนการลบเพื่อไม่ให้โพสต์เก่าพัง
                    </p>
                ) : null}
                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={pending}
                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={pending}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60"
                    >
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        เก็บถาวร
                    </button>
                </div>
            </div>
        </div>
    );
}

function BulkTagsDialog({
    selectedCount,
    tagSuggestions,
    onClose,
    onApply,
}: {
    selectedCount: number;
    tagSuggestions: TeachingMediaTagSuggestion[];
    onClose: () => void;
    onApply: (mode: "add" | "remove", tags: string[]) => void;
}) {
    const [mode, setMode] = useState<"add" | "remove">("add");
    const [tagsInput, setTagsInput] = useState("");
    const [error, setError] = useState<string | null>(null);

    function handleApply() {
        const tags = tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
        if (tags.length === 0) {
            setError("กรุณาใส่แท็กอย่างน้อย 1 แท็ก");
            return;
        }
        onApply(mode, tags);
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-black text-slate-800">จัดการแท็กหลายรายการ</h2>
                        <p className="text-xs font-bold text-slate-400">เลือกไว้ {selectedCount} รายการ</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-1.5 hover:bg-slate-100">
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-5">
                    <div className="grid grid-cols-2 gap-2">
                        {(["add", "remove"] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setMode(option)}
                                className={cn(
                                    "rounded-xl border px-3 py-2 text-sm font-black transition",
                                    mode === option
                                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                {option === "add" ? "เพิ่มแท็ก" : "ลบแท็ก"}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-black text-slate-600">
                            แท็ก <span className="font-normal text-slate-400">(คั่นด้วยจุลภาค)</span>
                        </label>
                        <input
                            type="text"
                            value={tagsInput}
                            onChange={(event) => setTagsInput(event.target.value)}
                            list="bulk-media-tag-suggestions"
                            placeholder="บทเรียน, ป.5, แบบฝึกหัด"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <datalist id="bulk-media-tag-suggestions">
                            {tagSuggestions.map((suggestion) => (
                                <option key={suggestion.tag} value={suggestion.tag} />
                            ))}
                        </datalist>
                    </div>
                    {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700"
                    >
                        <Tags className="h-4 w-4" />
                        บันทึกแท็ก
                    </button>
                </div>
            </div>
        </div>
    );
}

export function MediaLibraryGrid({
    initialItems,
    total,
    page,
    pageSize,
    currentQuery,
    currentType,
    currentArchived,
    currentSort,
    favoriteOnly,
    tagSuggestions,
}: {
    initialItems: TeachingMediaItem[];
    total: number;
    page: number;
    pageSize: number;
    currentQuery: string;
    currentType: string;
    currentArchived: ArchiveFilter;
    currentSort: SortOption;
    favoriteOnly: boolean;
    tagSuggestions: TeachingMediaTagSuggestion[];
}) {
    const [items, setItems] = useState(initialItems);
    const [editItem, setEditItem] = useState<TeachingMediaItem | null>(null);
    const [deleteItem, setDeleteItem] = useState<TeachingMediaItem | null>(null);
    const [previewItem, setPreviewItem] = useState<TeachingMediaItem | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
    const [bulkPending, startBulkTransition] = useTransition();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const query = currentQuery;
    const typeFilter = currentType;
    const sort = currentSort;
    const archiveFilter = currentArchived;
    const onlyFavorites = favoriteOnly;

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const filtered = useMemo(() => items, [items]);
    const visibleIds = useMemo(() => filtered.map((item) => item.id), [filtered]);
    const selectedItems = useMemo(
        () => items.filter((item) => selectedIds.includes(item.id)),
        [items, selectedIds]
    );
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    const selectedActiveCount = selectedItems.filter((item) => !item.isArchived).length;
    const selectedArchivedCount = selectedItems.filter((item) => item.isArchived).length;

    useEffect(() => {
        setItems(initialItems);
        setSelectedIds((prev) => prev.filter((id) => initialItems.some((item) => item.id === id)));
    }, [initialItems]);

    const updateUrl = useCallback(
        (patch: Partial<Record<"q" | "type" | "archived" | "sort" | "page" | "favorite", string>>) => {
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            for (const [key, value] of Object.entries(patch)) {
                if (!value || (key === "page" && value === "1")) {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            }
            router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    const handleSaved = useCallback((updated: TeachingMediaItem) => {
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setEditItem(null);
    }, []);

    const handleDeleted = useCallback((id: string) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? { ...item, isArchived: true, archivedAt: new Date() }
                    : item
            )
        );
        setDeleteItem(null);
        router.refresh();
    }, [router]);

    const handleRestored = useCallback(async (item: TeachingMediaItem) => {
        const restored = await restoreTeachingMedia(item.id);
        setItems((prev) => prev.map((entry) => (entry.id === restored.id ? restored : entry)));
        router.refresh();
    }, [router]);

    const handleFavoriteToggle = useCallback(async (item: TeachingMediaItem) => {
        const updated = await toggleTeachingMediaFavorite(item.id);
        setItems((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
        router.refresh();
    }, [router]);

    const toggleSelected = useCallback((id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
    }, []);

    const toggleSelectVisible = useCallback(() => {
        setSelectedIds((prev) =>
            allVisibleSelected
                ? prev.filter((id) => !visibleIds.includes(id))
                : [...new Set([...prev, ...visibleIds])]
        );
    }, [allVisibleSelected, visibleIds]);

    const handleBulkArchive = useCallback(() => {
        const ids = selectedItems.filter((item) => !item.isArchived).map((item) => item.id);
        if (ids.length === 0) return;
        startBulkTransition(async () => {
            await bulkArchiveTeachingMedia(ids);
            setItems((prev) =>
                prev.map((item) =>
                    ids.includes(item.id) ? { ...item, isArchived: true, archivedAt: new Date() } : item
                )
            );
            setSelectedIds([]);
            router.refresh();
        });
    }, [router, selectedItems]);

    const handleBulkRestore = useCallback(() => {
        const ids = selectedItems.filter((item) => item.isArchived).map((item) => item.id);
        if (ids.length === 0) return;
        startBulkTransition(async () => {
            await bulkRestoreTeachingMedia(ids);
            setItems((prev) =>
                prev.map((item) =>
                    ids.includes(item.id) ? { ...item, isArchived: false, archivedAt: null } : item
                )
            );
            setSelectedIds([]);
            router.refresh();
        });
    }, [router, selectedItems]);

    const handleBulkTags = useCallback((mode: "add" | "remove", tags: string[]) => {
        const ids = selectedItems.map((item) => item.id);
        if (ids.length === 0) return;
        startBulkTransition(async () => {
            await bulkUpdateTeachingMediaTags(ids, { mode, tags });
            setItems((prev) =>
                prev.map((item) => {
                    if (!ids.includes(item.id)) return item;
                    const nextTags =
                        mode === "add"
                            ? [...new Set([...item.tags, ...tags.map((tag) => tag.trim()).filter(Boolean)])].slice(0, 12)
                            : item.tags.filter((tag) => !tags.includes(tag));
                    return { ...item, tags: nextTags };
                })
            );
            setBulkTagsOpen(false);
            setSelectedIds([]);
            router.refresh();
        });
    }, [router, selectedItems]);

    if (items.length === 0 && total === 0) return null;

    return (
        <>
            <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            list="media-search-suggestions"
                            onChange={(event) =>
                                updateUrl({
                                    q: event.target.value.trim(),
                                    page: "1",
                                })
                            }
                            placeholder="ค้นหาชื่อสื่อหรือแท็ก..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <datalist id="media-search-suggestions">
                            {tagSuggestions.map((suggestion) => (
                                <option key={suggestion.tag} value={suggestion.tag} />
                            ))}
                        </datalist>
                        {query ? (
                            <button
                                type="button"
                                onClick={() => updateUrl({ q: "", page: "1" })}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-slate-100"
                            >
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                        ) : null}
                    </div>
                    <select
                        value={sort}
                        onChange={(event) => updateUrl({ sort: event.target.value, page: "1" })}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {ARCHIVE_FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() => updateUrl({ archived: filter.value, page: "1" })}
                            className={cn(
                                "rounded-xl px-3 py-1.5 text-xs font-black transition",
                                archiveFilter === filter.value
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => updateUrl({ favorite: onlyFavorites ? "" : "1", page: "1" })}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition",
                            onlyFavorites
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        <Star className={cn("h-3.5 w-3.5", onlyFavorites ? "fill-current" : "")} />
                        รายการโปรด
                    </button>
                    {TYPE_FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() => updateUrl({ type: filter.value, page: "1" })}
                            className={cn(
                                "rounded-xl px-3 py-1.5 text-xs font-black transition",
                                typeFilter === filter.value
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            {filter.label}
                        </button>
                        ))}
                </div>

                {tagSuggestions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {tagSuggestions.slice(0, 8).map((suggestion) => (
                            <button
                                key={suggestion.tag}
                                type="button"
                                onClick={() => updateUrl({ q: suggestion.tag, page: "1" })}
                                className={cn(
                                    "rounded-full px-3 py-1 text-[11px] font-black transition",
                                    query === suggestion.tag
                                        ? "bg-indigo-600 text-white"
                                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                )}
                            >
                                #{suggestion.tag}
                            </button>
                        ))}
                    </div>
                ) : null}

                <p className="text-xs font-bold text-slate-400">
                    {total === 0
                        ? "0 รายการ"
                        : `แสดง ${Math.min((page - 1) * pageSize + 1, total)}-${Math.min(page * pageSize, total)} จาก ${total} รายการ`}
                </p>
            </div>

            {filtered.length > 0 ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600">
                        <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectVisible}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />
                        เลือกทั้งหมดในหน้านี้
                    </label>

                    {selectedIds.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                                เลือกแล้ว {selectedIds.length} รายการ
                            </span>
                            <button
                                type="button"
                                onClick={() => setBulkTagsOpen(true)}
                                disabled={bulkPending}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                            >
                                <Tags className="h-3.5 w-3.5" />
                                จัดการแท็ก
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkArchive}
                                disabled={bulkPending || selectedActiveCount === 0}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                            >
                                {bulkPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                                เก็บถาวร
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkRestore}
                                disabled={bulkPending || selectedArchivedCount === 0}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                กู้คืน
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                disabled={bulkPending}
                                className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 hover:bg-white disabled:opacity-50"
                            >
                                ล้างที่เลือก
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {filtered.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                    <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="font-black text-slate-500">ไม่พบสื่อที่ค้นหา</p>
                    <p className="mt-1 text-sm text-slate-400">ลองเปลี่ยนคำค้นหา หรือปรับตัวกรองสถานะและประเภทสื่อ</p>
                    <button
                        type="button"
                        onClick={() => {
                            updateUrl({
                                q: "",
                                type: "",
                                archived: "active",
                                sort: "newest",
                                favorite: "",
                                page: "1",
                            });
                        }}
                        className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                    >
                        ล้างตัวกรอง
                    </button>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((item) => {
                        const meta = formatFileSize(item.size);
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <div
                                key={item.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setPreviewItem(item)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        setPreviewItem(item);
                                    }
                                }}
                                className={cn(
                                    "group cursor-pointer rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md",
                                    isSelected ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100"
                                )}
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <label
                                        className="inline-flex items-center gap-2 text-[11px] font-black text-slate-500"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelected(item.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                        />
                                        เลือก
                                    </label>
                                    {isSelected ? (
                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                                            เลือกแล้ว
                                        </span>
                                    ) : null}
                                </div>
                                <div className="mb-3 flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                        <MediaIcon type={item.type} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-sm font-black text-slate-900">{item.title}</h3>
                                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                                            {TYPE_LABEL[item.type] ?? item.type}
                                            {meta ? ` · ${meta}` : ""}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            void handleFavoriteToggle(item);
                                        }}
                                        className={cn(
                                            "rounded-xl p-2 transition hover:bg-amber-50",
                                            item.isFavorite ? "text-amber-500" : "text-slate-300 hover:text-amber-500"
                                        )}
                                        aria-label={item.isFavorite ? "เอาออกจากรายการโปรด" : "เพิ่มเป็นรายการโปรด"}
                                    >
                                        <Star className={cn("h-4 w-4", item.isFavorite ? "fill-current" : "")} />
                                    </button>
                                    <KebabMenu
                                        item={item}
                                        onEdit={() => setEditItem(item)}
                                        onDelete={() => setDeleteItem(item)}
                                        onRestore={() => void handleRestored(item)}
                                    />
                                </div>

                                <p className="truncate text-xs text-slate-500">
                                    {item.name ||
                                        item.linkUrl ||
                                        item.url ||
                                        (item.youtubeId ? `youtube.com/watch?v=${item.youtubeId}` : "สื่อในคลัง")}
                                </p>

                                {item.tags.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {item.tags.slice(0, 4).map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => updateUrl({ q: tag, page: "1" })}
                                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-indigo-100 hover:text-indigo-700"
                                            >
                                                #{tag}
                                            </button>
                                        ))}
                                        {item.tags.length > 4 ? (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                                +{item.tags.length - 4}
                                            </span>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="mt-3 flex items-center justify-between">
                                    <span
                                        className={cn(
                                            "rounded-full px-2 py-0.5 text-[10px] font-black",
                                            item.isArchived
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-emerald-100 text-emerald-700"
                                        )}
                                    >
                                        {item.isArchived ? "เก็บถาวร" : "ใช้งานอยู่"}
                                    </span>
                                    {item.isFavorite ? (
                                        <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                            รายการโปรด
                                        </span>
                                    ) : null}
                                    <div className="ml-auto flex flex-col items-end gap-0.5 text-right">
                                        {item.usageCount > 0 ? (
                                            <span className="text-[10px] font-bold text-slate-400">
                                                ใช้งานแล้ว {item.usageCount} ครั้ง
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300">ยังไม่ถูกใช้งาน</span>
                                        )}
                                        {item.lastUsedAt ? (
                                            <span className="text-[10px] font-medium text-slate-300">
                                                ล่าสุด {formatLastUsedAt(item.lastUsedAt)}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {totalPages > 1 ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-400">
                        หน้า {page} จาก {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => updateUrl({ page: String(page - 1) })}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ก่อนหน้า
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => updateUrl({ page: String(page + 1) })}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            ) : null}

            {editItem ? (
                <EditDialog
                    item={editItem}
                    onClose={() => setEditItem(null)}
                    onSaved={handleSaved}
                    tagSuggestions={tagSuggestions}
                />
            ) : null}
            {deleteItem ? (
                <DeleteConfirm item={deleteItem} onClose={() => setDeleteItem(null)} onDeleted={handleDeleted} />
            ) : null}
            {bulkTagsOpen ? (
                <BulkTagsDialog
                    selectedCount={selectedIds.length}
                    tagSuggestions={tagSuggestions}
                    onClose={() => setBulkTagsOpen(false)}
                    onApply={handleBulkTags}
                />
            ) : null}
            <PreviewModal item={previewItem} open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)} />
        </>
    );
}
