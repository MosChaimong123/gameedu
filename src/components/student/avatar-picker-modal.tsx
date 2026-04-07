"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Shuffle } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

// 24 curated bottts seeds
const AVATAR_SEEDS = [
    "felix", "nova", "luna", "echo", "orbit", "pixel",
    "spark", "nimbus", "zeta", "blix", "rune", "comet",
    "droid", "vega", "flux", "byte", "titan", "glitch",
    "nano", "quasar", "nexus", "prism", "cipher", "astra"
];

function randomSeed() {
    return Math.random().toString(36).substring(2, 8);
}

interface AvatarPickerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    studentId: string;
    loginCode: string;
    currentAvatar: string;
    onSaved: (newAvatar: string) => void;
    theme?: string;
}

export function AvatarPickerModal({
    open, onOpenChange, classId, studentId, loginCode,
    currentAvatar, onSaved, theme
}: AvatarPickerModalProps) {
    void theme;
    const { t } = useLanguage();
    const [selected, setSelected] = useState(currentAvatar);
    const [loading, setLoading] = useState(false);
    const [customSeeds, setCustomSeeds] = useState<string[]>([]);

    const allSeeds = [...AVATAR_SEEDS, ...customSeeds];

    const handleShuffle = () => {
        setCustomSeeds(prev => [...prev, randomSeed()]);
    };

    const handleSave = async () => {
        if (selected === currentAvatar) { onOpenChange(false); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/students/${studentId}/avatar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar: selected, loginCode })
            });
            if (res.ok) {
                onSaved(selected);
                onOpenChange(false);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] w-[96vw] rounded-2xl border-0 shadow-2xl p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 py-5 bg-gradient-to-r from-indigo-500 to-purple-600">
                    <DialogTitle className="text-white text-xl font-bold">{t("avatarPickerTitle")}</DialogTitle>
                    <p className="text-white/70 text-sm mt-1">{t("avatarPickerSubtitle")}</p>
                </DialogHeader>

                <div className="p-5 bg-[#F4F6FB]">
                    {/* Current selected big preview */}
                    <div className="flex justify-center mb-5">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-2xl bg-white border-4 border-indigo-400 shadow-xl overflow-hidden">
                                <Image
                                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selected}&backgroundColor=transparent`}
                                    alt={t("avatarPickerImageAltSelected")}
                                    fill
                                    sizes="112px"
                                    unoptimized
                                    className="object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full font-semibold whitespace-nowrap shadow">
                                {t("avatarPickerSelectedBadge")}
                            </div>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-6 gap-2 max-h-[280px] overflow-y-auto pr-1">
                        {allSeeds.map(seed => {
                            const isSelected = seed === selected;
                            return (
                                <button
                                    key={seed}
                                    onClick={() => setSelected(seed)}
                                    className={`relative rounded-xl p-1.5 border-2 transition-all hover:scale-105 active:scale-95 ${
                                        isSelected
                                            ? "border-indigo-500 bg-indigo-50 shadow-md"
                                            : "border-transparent bg-white hover:border-indigo-200 shadow-sm"
                                    }`}
                                >
                                    <Image
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=transparent`}
                                        alt={`${t("avatarPickerImageAltOption")} ${seed}`}
                                        fill
                                        sizes="64px"
                                        unoptimized
                                        className="object-cover"
                                        loading="lazy"
                                    />
                                    {isSelected && (
                                        <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Shuffle button */}
                    <button
                        onClick={handleShuffle}
                        className="mt-3 w-full py-2 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                    >
                        <Shuffle className="w-4 h-4" /> {t("avatarPickerRandomButton")}
                    </button>
                </div>

                <div className="px-5 py-4 bg-white border-t border-slate-100 flex gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl border-2" disabled={loading}>
                        {t("avatarPickerCancel")}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("avatarPickerSave")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
