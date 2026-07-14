"use client";

import { useEffect, useMemo, useState } from "react";
import { Library, Loader2, PanelsTopLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTeachingMedia, type TeachingMediaItem } from "@/lib/actions/teaching-media-actions";
import type { WorksheetData } from "@/lib/worksheet-schema";
import { countWorksheetItems, sumWorksheetMaxScore } from "@/lib/worksheet-assignment";

type WorksheetMediaItem = TeachingMediaItem & { worksheetData: WorksheetData };

type Props = {
    selectedId: string;
    selectedWorksheet: WorksheetData | null;
    onSelect: (item: WorksheetMediaItem) => void;
    disabled?: boolean;
};

function isWorksheetMediaItem(item: TeachingMediaItem): item is WorksheetMediaItem {
    return item.type === "worksheet" && Boolean(item.worksheetData);
}

export function WorksheetMediaPickerPanel({
    selectedId,
    selectedWorksheet,
    onSelect,
    disabled,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<WorksheetMediaItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled) setLoading(true);
        });
        listTeachingMedia({ type: "worksheet", query: query || undefined, limit: 60 })
            .then((result) => {
                if (!cancelled) setItems(result.filter(isWorksheetMediaItem));
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
    }, [open, query]);

    const selectedSummary = useMemo(() => {
        if (!selectedWorksheet) return null;
        return {
            items: countWorksheetItems(selectedWorksheet),
            score: sumWorksheetMaxScore(selectedWorksheet),
        };
    }, [selectedWorksheet]);

    return (
        <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-fuchsia-700 shadow-sm">
                        <PanelsTopLeft className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800">ใบงานโต้ตอบจากคลังสื่อ</p>
                        <p className="text-xs font-medium text-slate-500">
                            สร้างต้นฉบับที่คลังสื่อ แล้วเลือกใบงานที่ต้องการมอบหมายให้ห้องนี้
                        </p>
                        {selectedSummary ? (
                            <p className="mt-1 text-xs font-black text-fuchsia-700">
                                เลือกแล้ว {selectedSummary.items} จุดตอบ · {selectedSummary.score} คะแนน
                            </p>
                        ) : null}
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setOpen((value) => !value)}
                    className="rounded-xl border-fuchsia-200 bg-white font-bold text-fuchsia-700 hover:bg-fuchsia-50"
                >
                    <Library className="mr-1.5 h-4 w-4" />
                    {open ? "ซ่อนคลัง" : "เลือกจากคลัง"}
                </Button>
            </div>

            {open ? (
                <div className="mt-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="ค้นหาใบงานโต้ตอบในคลัง"
                            className="h-10 rounded-xl border-fuchsia-100 bg-white pl-9"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-2xl border border-fuchsia-100 bg-white">
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 p-5 text-sm font-bold text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังโหลดใบงานจากคลัง
                            </div>
                        ) : items.length === 0 ? (
                            <div className="p-5 text-center text-sm font-bold text-slate-400">
                                ยังไม่พบใบงานโต้ตอบในคลังสื่อ
                            </div>
                        ) : (
                            items.map((item) => {
                                const active = selectedId === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => onSelect(item)}
                                        className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-fuchsia-50"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-700">
                                            <PanelsTopLeft className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-black text-slate-800">{item.title}</span>
                                            <span className="block truncate text-xs font-medium text-slate-400">
                                                {countWorksheetItems(item.worksheetData)} จุดตอบ · {sumWorksheetMaxScore(item.worksheetData)} คะแนน
                                            </span>
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                                            {active ? "เลือกแล้ว" : "เลือก"}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : null}

            {selectedWorksheet ? null : (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-fuchsia-200 bg-white px-3 py-2 text-xs font-bold text-fuchsia-700">
                    <X className="h-3.5 w-3.5" />
                    ยังไม่ได้เลือกใบงานจากคลัง
                </div>
            )}
        </div>
    );
}
