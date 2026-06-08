"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, ImageIcon, Library, LinkIcon, Loader2, PlaySquare, Search, X, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTeachingMedia, type TeachingMediaItem } from "@/lib/actions/teaching-media-actions";
import {
    createTeachingMediaReference,
    describeTeachingMediaReference,
    type TeachingMediaReference,
} from "@/lib/teaching-media-reference";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
    file: "ไฟล์",
    image: "รูปภาพ",
    video: "วิดีโอ",
    youtube: "YouTube",
    link: "ลิงก์",
};

function MediaIcon({ type, className }: { type: string; className?: string }) {
    const cls = cn("h-4 w-4", className);
    if (type === "image") return <ImageIcon className={cls} />;
    if (type === "video") return <PlaySquare className={cls} />;
    if (type === "youtube") return <Youtube className={cls} />;
    if (type === "link") return <LinkIcon className={cls} />;
    return <FileText className={cls} />;
}

export function TeachingMediaPickerPanel({
    selected,
    onChange,
    allowedTypes,
    title = "สื่อประกอบจากคลัง",
    description = "เลือกสื่อที่เคยบันทึกไว้มาแนบกับงานนี้",
}: {
    selected: TeachingMediaReference[];
    onChange: (next: TeachingMediaReference[]) => void;
    allowedTypes?: string[];
    title?: string;
    description?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<TeachingMediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const allowed = useMemo(() => new Set(allowedTypes ?? ["file", "image", "video", "youtube", "link"]), [allowedTypes]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        listTeachingMedia({ query: query || undefined, limit: 60 })
            .then((result) => {
                if (!cancelled) setItems(result.filter((item) => allowed.has(item.type)));
            })
            .catch(() => {
                if (!cancelled) setItems([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [allowed, open, query]);

    function addItem(item: TeachingMediaItem) {
        const reference = createTeachingMediaReference(item);
        if (selected.some((entry) => entry.mediaId === reference.mediaId)) return;
        onChange([...selected, reference]);
    }

    function removeItem(index: number) {
        onChange(selected.filter((_, itemIndex) => itemIndex !== index));
    }

    return (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                        <Library className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800">{title}</p>
                        <p className="text-xs font-medium text-slate-500">{description}</p>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen((value) => !value)}
                    className="rounded-xl border-indigo-200 bg-white font-bold text-indigo-700 hover:bg-indigo-50"
                >
                    <Library className="mr-1.5 h-4 w-4" />
                    {open ? "ซ่อนคลัง" : "เลือกจากคลัง"}
                </Button>
            </div>

            {selected.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {selected.map((reference, index) => (
                        <span
                            key={`${reference.mediaId ?? reference.title}-${index}`}
                            className="inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-bold text-slate-600"
                        >
                            <MediaIcon type={reference.type} className="text-indigo-500" />
                            <span className="max-w-[14rem] truncate">{reference.title}</span>
                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="rounded-full text-slate-300 hover:text-red-500"
                                aria-label="ลบสื่อที่เลือก"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            ) : null}

            {open ? (
                <div className="mt-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="ค้นหาสื่อในคลัง"
                            className="h-10 rounded-xl border-indigo-100 bg-white pl-9"
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto rounded-2xl border border-indigo-100 bg-white">
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 p-5 text-sm font-bold text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังโหลดคลังสื่อ
                            </div>
                        ) : items.length === 0 ? (
                            <div className="p-5 text-center text-sm font-bold text-slate-400">ไม่พบสื่อที่เลือกได้</div>
                        ) : (
                            items.map((item) => {
                                const selectedAlready = selected.some((entry) => entry.mediaId === item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => addItem(item)}
                                        disabled={selectedAlready}
                                        className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                            <MediaIcon type={item.type} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-black text-slate-800">{item.title}</span>
                                            <span className="block truncate text-xs font-medium text-slate-400">
                                                {TYPE_LABEL[item.type] ?? item.type} · {describeTeachingMediaReference(createTeachingMediaReference(item))}
                                            </span>
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                                            {selectedAlready ? "เลือกแล้ว" : "เลือก"}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
