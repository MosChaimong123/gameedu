"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Swords, Shield, Zap, Sparkles, CheckCircle2, Info } from "lucide-react";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import { cn } from "@/lib/utils";
import axios, { isAxiosError } from "axios";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { getLocalizedMessageFromApiErrorBody } from "@/lib/ui-error-messages";
import type { MonsterType } from "@/lib/types/negamon";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

interface StarterSelectionModalProps {
    loginCode: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    /** species IDs ที่ classroom อนุญาต — ถ้าไม่ส่งหรือ empty แสดงทั้งหมด */
    allowedSpeciesIds?: string[];
    /** callback เมื่อกด "ไว้ก่อน" (ปิดโดยไม่เลือก) */
    onDismiss?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
    FIRE:    "bg-orange-100 text-orange-700 border-orange-200",
    WATER:   "bg-sky-100 text-sky-700 border-sky-200",
    EARTH:   "bg-green-100 text-green-700 border-green-200",
    WIND:    "bg-cyan-100 text-cyan-700 border-cyan-200",
    THUNDER: "bg-yellow-100 text-yellow-700 border-yellow-200",
    LIGHT:   "bg-amber-100 text-amber-700 border-amber-200",
    DARK:    "bg-purple-100 text-purple-700 border-purple-200",
    PSYCHIC: "bg-pink-100 text-pink-700 border-pink-200",
};

const STAT_CONFIG = [
    { key: "hp",  labelKey: "playNegamonHpLabel", icon: Heart,  color: "text-rose-500",    bar: "[&>div]:bg-rose-400"    },
    { key: "atk", labelKey: "hostStatAtk",       icon: Swords,  color: "text-orange-500",  bar: "[&>div]:bg-orange-400"  },
    { key: "def", labelKey: "hostStatDef",       icon: Shield,  color: "text-sky-500",     bar: "[&>div]:bg-sky-400"     },
    { key: "spd", labelKey: "monsterStatSpd",    icon: Zap,     color: "text-yellow-500",  bar: "[&>div]:bg-yellow-400"  },
] as const;

export function StarterSelectionModal({ loginCode, isOpen, onOpenChange, allowedSpeciesIds, onDismiss }: StarterSelectionModalProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { t } = useLanguage();

    const visibleSpecies =
        allowedSpeciesIds && allowedSpeciesIds.length > 0
            ? DEFAULT_NEGAMON_SPECIES.filter((s) => allowedSpeciesIds.includes(s.id))
            : DEFAULT_NEGAMON_SPECIES;

    const selectedSpecies = visibleSpecies.find(s => s.id === selectedId);

    const handleSelect = async () => {
        if (!selectedId) return;
        setIsSubmitting(true);
        try {
            await axios.post("/api/student/negamon/select", {
                loginCode,
                speciesId: selectedId,
            });
            toast({
                title: t("negamonStarterToastOkTitle"),
                description: t("negamonStarterToastOkDesc"),
            });
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Selection error:", error);
            const description = isAxiosError(error) && error.response?.data
                ? getLocalizedMessageFromApiErrorBody(error.response.data, t, {
                      fallbackTranslationKey: "negamonStarterToastErrDesc",
                  })
                : t("negamonStarterToastErrDesc");
            toast({
                title: t("negamonStarterToastErrTitle"),
                description,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none overflow-hidden sm:rounded-[2.5rem]">
                <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border-4 border-white/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black flex items-center gap-3">
                                <Sparkles className="w-8 h-8 text-yellow-300" />
                                {t("negamonStarterModalTitle")}
                            </DialogTitle>
                            <DialogDescription className="text-white/80 text-base font-medium">
                                {t("negamonStarterModalSubtitle")}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {visibleSpecies.map((species) => {
                                const isSelected = selectedId === species.id;
                                const rank1 = species.forms[1] || species.forms[0];
                                
                                return (
                                    <motion.div
                                        key={species.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedId(species.id)}
                                        className={cn(
                                            "relative cursor-pointer rounded-3xl p-4 transition-all border-2 flex flex-col items-center text-center",
                                            isSelected 
                                                ? "bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-100" 
                                                : "bg-slate-50/50 border-slate-100 hover:border-indigo-200"
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 text-indigo-600">
                                                <CheckCircle2 className="w-6 h-6 fill-white" />
                                            </div>
                                        )}
                                        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                                            <NegamonFormIcon
                                                icon={rank1.icon}
                                                label={species.name}
                                                className="h-full w-full"
                                                emojiClassName="text-3xl"
                                                width={64}
                                                height={64}
                                                imageClassName="h-full w-full object-contain"
                                            />
                                        </div>
                                        <h4 className="font-black text-slate-800 text-sm mb-1">{species.name}</h4>
                                        <Badge className={cn("text-[8px] font-black px-1.5 py-0 rounded-md border scale-90", TYPE_COLORS[species.type])}>
                                            {t(`monsterType_${species.type as MonsterType}`)}
                                        </Badge>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Selected Details */}
                        <AnimatePresence mode="wait">
                            {selectedId && selectedSpecies && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mt-8 bg-slate-50 border border-slate-100 rounded-[2rem] p-6 grid md:grid-cols-2 gap-8 items-center"
                                >
                                    <div className="flex flex-col items-center md:items-start">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border-2 border-indigo-100 bg-white shadow-xl">
                                                <NegamonFormIcon
                                                    icon={selectedSpecies.forms[1]?.icon || "🥚"}
                                                    label={selectedSpecies.name}
                                                    className="h-full w-full"
                                                    emojiClassName="text-5xl"
                                                    width={80}
                                                    height={80}
                                                    imageClassName="h-full w-full object-contain"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-800">{selectedSpecies.name}</h3>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge className={cn("text-[10px] font-black", TYPE_COLORS[selectedSpecies.type])}>
                                                        {t(`monsterType_${selectedSpecies.type as MonsterType}`)}
                                                    </Badge>
                                                    {selectedSpecies.type2 && (
                                                        <Badge className={cn("text-[10px] font-black", TYPE_COLORS[selectedSpecies.type2])}>
                                                            {t(`monsterType_${selectedSpecies.type2 as MonsterType}`)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium italic leading-relaxed text-center md:text-left">
                                            {t("negamonStarterFlavorLine")}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Info className="w-4 h-4 text-indigo-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("negamonStarterBaseStatsLabel")}</span>
                                        </div>
                                        {STAT_CONFIG.map(({ key, labelKey, icon: Icon, color, bar }) => {
                                            const val = selectedSpecies.baseStats[key as keyof typeof selectedSpecies.baseStats];
                                            const pct = Math.round((val / 100) * 100);
                                            return (
                                                <div key={key} className="flex items-center gap-3">
                                                    <Icon className={cn("w-4 h-4 shrink-0", color)} />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase w-7 shrink-0">{t(labelKey)}</span>
                                                    <Progress value={pct} className={cn("h-2 flex-1 bg-white rounded-full border border-slate-100", bar)} />
                                                    <span className="text-xs font-black text-slate-600 w-8 text-right shrink-0">{val}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                        <DialogFooter className="flex-col sm:flex-row gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => { onDismiss?.(); onOpenChange(false); }}
                                className="rounded-2xl font-bold order-2 sm:order-1"
                            >
                                {t("negamonStarterLater")}
                            </Button>
                            <Button
                                disabled={!selectedId || isSubmitting}
                                onClick={handleSelect}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl h-12 px-10 font-black shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:grayscale order-1 sm:order-2"
                            >
                                {isSubmitting ? t("negamonStarterSubmitting") : t("negamonStarterConfirm")}
                            </Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
