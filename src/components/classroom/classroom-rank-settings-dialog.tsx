"use client";

import { useState } from "react";
import { Classroom } from "@prisma/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/providers/language-provider";
import {
    parseLevelConfigToEntries,
    type RankEntry,
    type LevelConfigInput,
    DEFAULT_RANK_ENTRIES,
    getThemeBgStyle,
    getThemeHorizontalBgClass,
} from "@/lib/classroom-utils";
import { cn } from "@/lib/utils";
import { gamificationToolbarButtonClassName } from "./gamification-toolbar-styles";

const RANK_NAME_TO_KEY: Record<string, string> = {
    Common: "rankLabelCommon",
    Uncommon: "rankLabelUncommon",
    Rare: "rankLabelRare",
    Epic: "rankLabelEpic",
    Legendary: "rankLabelLegendary",
    Mythic: "rankLabelMythic",
};

interface ClassroomRankSettingsDialogProps {
    classroom: Classroom;
    onSaved?: (classroom: Classroom) => void;
}

export function ClassroomRankSettingsDialog({
    classroom,
    onSaved,
}: ClassroomRankSettingsDialogProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [ranks, setRanks] = useState<RankEntry[]>(() => {
        const current = parseLevelConfigToEntries(classroom.levelConfig as LevelConfigInput);
        return DEFAULT_RANK_ENTRIES.map((def, idx) => {
            const existing = current.find(r => r.name === def.name);
            if (existing) return { ...def, ...existing };

            if (current[idx]) {
                return { ...def, minScore: current[idx].minScore, goldRate: current[idx].goldRate || def.goldRate };
            }
            return def;
        });
    });

    const handleRankChange = (index: number, field: keyof RankEntry, value: string | number) => {
        setRanks(prev => prev.map((r, i) => i !== index ? r : { ...r, [field]: value }));
    };

    const rankTranslatedLabel = (name: string) => {
        const key = RANK_NAME_TO_KEY[name];
        return key ? t(key) : name;
    };

    const theme = classroom.theme || "";

    const onSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ levelConfig: ranks })
            });
            if (res.ok) {
                const updatedClassroom = await res.json() as Classroom;
                toast({ title: t("settingsSaved") });
                onSaved?.(updatedClassroom);
                setOpen(false);
            } else throw new Error("Failed");
        } catch {
            toast({
                title: t("rankSettingsSaveFailTitle"),
                variant: "destructive",
                description: t("rankSettingsSaveFailDesc"),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm" className={gamificationToolbarButtonClassName}>
                    <Crown className="mr-1.5 h-4 w-4 shrink-0 opacity-95" />
                    {t("rankSettingsTrigger")}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[700px] w-[96vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-0 bg-[#F4F6FB]">
                <div
                    className={cn("shrink-0 px-6 py-5 text-white", getThemeHorizontalBgClass(theme))}
                    style={getThemeBgStyle(theme)}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20 shadow-inner">
                                <Crown className="h-5 w-5" />
                            </div>
                            {t("rankSettingsTitle")}
                        </DialogTitle>
                        <p className="mt-1 text-sm text-white/80">{t("rankSettingsSubtitle")}</p>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                        <div>
                            {t("rankSettingsInfo")}
                            <p className="text-xs opacity-70 mt-1">{t("rankSettingsInfoNote")}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-[48px_1fr_90px_90px_48px] items-center gap-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="text-center">{t("rankSettingsColIcon")}</span>
                        <span>{t("rankSettingsColName")}</span>
                        <span className="text-center">{t("rankSettingsColMinScore")}</span>
                        <span className="text-center">{t("rankSettingsColGoldRate")}</span>
                        <span className="text-center">{t("rankSettingsColFrameColor")}</span>
                    </div>

                    <div className="space-y-2">
                        {ranks.map((rank, i) => (
                            <div key={i} className="relative">
                                <div
                                    className="grid grid-cols-[48px_1fr_90px_90px_48px] items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm border-2 transition-colors"
                                    style={{ borderColor: rank.color || "#e2e8f0" }}
                                >
                                    <div className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                        <span className="text-2xl">{rank.icon ?? "⭐"}</span>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">{rank.name}</span>
                                        <span className="text-xs font-medium text-slate-500">({rankTranslatedLabel(rank.name)})</span>
                                    </div>

                                    <Input
                                        type="number"
                                        value={rank.minScore}
                                        onChange={(e) => handleRankChange(i, "minScore", parseInt(e.target.value) || 0)}
                                        className="h-9 font-bold text-center border-slate-200 rounded-lg bg-slate-50"
                                    />

                                    <Input
                                        type="number"
                                        value={rank.goldRate}
                                        onChange={(e) => handleRankChange(i, "goldRate", parseInt(e.target.value) || 0)}
                                        className="h-9 font-bold text-center border-slate-200 rounded-lg bg-amber-50 text-amber-700"
                                    />

                                    <div className="flex justify-center">
                                        <div
                                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                            style={{ backgroundColor: rank.color || "#94a3b8" }}
                                            title={t("rankSettingsSwatchTitle")}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-white/50 border-t gap-3 shrink-0">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("cancel")}</Button>
                    <Button
                        onClick={onSave}
                        disabled={loading}
                        className={cn(
                            "border-0 px-8 font-bold text-white shadow-md transition-opacity hover:opacity-90",
                            getThemeHorizontalBgClass(theme)
                        )}
                        style={getThemeBgStyle(theme)}
                    >
                        {loading ? t("rankSettingsSaving") : t("rankSettingsSave")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
