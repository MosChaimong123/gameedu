"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Swords, Settings2, Users, Zap, BookOpen, Check, Shuffle, Trash2, ChevronDown, ChevronRight, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import type { MonsterType, NegamonSettings } from "@/lib/types/negamon";
import type { PlanId } from "@/constants/pricing";
import { useLanguage } from "@/components/providers/language-provider";
import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages";
import { PLAN_LIMITS } from "@/constants/plan-limits";
import { getAllowedNegamonSpeciesIdsForPlan } from "@/lib/plan/plan-access";
import { useSession } from "next-auth/react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";
import { normalizeGamificationSettings } from "@/lib/services/classroom-settings/gamification-settings-schema";

const UNASSIGNED_VALUE = "__negamon_unassigned__";

export type NegamonStudentOption = { id: string; name: string };

const TYPE_COLORS: Record<string, string> = {
    FIRE: "bg-orange-100 text-orange-700 border-orange-200",
    WATER: "bg-sky-100 text-sky-700 border-sky-200",
    EARTH: "bg-green-100 text-green-700 border-green-200",
    WIND: "bg-cyan-100 text-cyan-700 border-cyan-200",
    THUNDER: "bg-yellow-100 text-yellow-700 border-yellow-200",
    LIGHT: "bg-amber-100 text-amber-700 border-amber-200",
    DARK: "bg-purple-100 text-purple-700 border-purple-200",
};

interface NegamonSettingsDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    classroomId: string;
    currentSettings: NegamonSettings | null;
    existingGamifiedSettings?: Record<string, unknown> | null;
    students?: NegamonStudentOption[];
    onSaved: (settings: NegamonSettings, gamifiedSettings?: Record<string, unknown>) => void;
}

export function NegamonSettingsDialog({
    open,
    onOpenChange,
    classroomId,
    currentSettings,
    existingGamifiedSettings,
    students = [],
    onSaved,
}: NegamonSettingsDialogProps) {
    const { toast } = useToast();
    const { t, language } = useLanguage();
    const { data: session, status } = useSession();
    const [isPending, startTransition] = useTransition();

    const [enabled, setEnabled] = useState(currentSettings?.enabled ?? false);
    const [allowStudentChoice, setAllowStudentChoice] = useState(currentSettings?.allowStudentChoice ?? true);
    const [expPerPoint, setExpPerPoint] = useState(currentSettings?.expPerPoint ?? 10);
    const [expPerAttendance, setExpPerAttendance] = useState(currentSettings?.expPerAttendance ?? 20);
    const currentPlan =
        status === "loading"
            ? null
            : ((session?.user?.plan ?? "FREE") as PlanId);
    const currentPlanLimits = currentPlan ? PLAN_LIMITS[currentPlan] : null;
    const maxSpeciesAllowed = currentPlanLimits?.maxNegamonSpeciesInClassroom ?? null;
    const allowedSpeciesIds = currentPlanLimits
        ? getAllowedNegamonSpeciesIdsForPlan(currentPlanLimits)
        : new Set(DEFAULT_NEGAMON_SPECIES.map((s) => s.id));
    const defaultSelectedSpeciesIds = DEFAULT_NEGAMON_SPECIES
        .map((s) => s.id)
        .filter((id) => allowedSpeciesIds.has(id));
    const normalizeSelectedSpeciesIds = (ids: string[] | undefined): string[] => {
        const source = ids ?? [];
        const normalized = source.filter((id) => allowedSpeciesIds.has(id));
        return normalized.length > 0 ? normalized : defaultSelectedSpeciesIds;
    };
    const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>(
        normalizeSelectedSpeciesIds(currentSettings?.species?.map((s) => s.id))
    );
    const disallowedSelectedSpeciesIds = selectedSpeciesIds.filter((id) => !allowedSpeciesIds.has(id));
    const planLimitExceeded =
        typeof maxSpeciesAllowed === "number" &&
        maxSpeciesAllowed !== Number.POSITIVE_INFINITY &&
        selectedSpeciesIds.length > maxSpeciesAllowed;
    const planSpeciesInvalid = disallowedSelectedSpeciesIds.length > 0;

    const [studentMonsters, setStudentMonsters] = useState<Record<string, string>>(
        () => ({ ...(currentSettings?.studentMonsters ?? {}) })
    );
    const [disabledMoves, setDisabledMoves] = useState<string[]>(
        () => [...(currentSettings?.disabledMoves ?? [])]
    );
    const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null);
    const [fetchedGamifiedSettings, setFetchedGamifiedSettings] = useState<Record<string, unknown> | null>(
        () =>
            existingGamifiedSettings &&
            typeof existingGamifiedSettings === "object" &&
            !Array.isArray(existingGamifiedSettings)
                ? normalizeGamificationSettings(existingGamifiedSettings)
                : null
    );
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (!open) {
            wasOpenRef.current = false;
            return;
        }
        if (wasOpenRef.current) return;

        wasOpenRef.current = true;
        const s = currentSettings;
        setEnabled(s?.enabled ?? false);
        setAllowStudentChoice(s?.allowStudentChoice ?? true);
        setExpPerPoint(s?.expPerPoint ?? 10);
        setExpPerAttendance(s?.expPerAttendance ?? 20);
        setSelectedSpeciesIds(normalizeSelectedSpeciesIds(s?.species?.map((x) => x.id)));
        setStudentMonsters({ ...(s?.studentMonsters ?? {}) });
        setDisabledMoves([...(s?.disabledMoves ?? [])]);
        setExpandedSpecies(null);
    }, [currentSettings, open, normalizeSelectedSpeciesIds]);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        void fetch(`/api/classrooms/${classroomId}/gamification-settings`)
            .then(async (res) => {
                if (!res.ok) return null;
                return res.json() as Promise<{ gamifiedSettings?: Record<string, unknown> }>;
            })
            .then((data) => {
                if (cancelled || !data?.gamifiedSettings) return;
                setFetchedGamifiedSettings(data.gamifiedSettings);
            })
            .catch(() => {
                if (!cancelled) {
                    setFetchedGamifiedSettings(
                        existingGamifiedSettings &&
                            typeof existingGamifiedSettings === "object" &&
                            !Array.isArray(existingGamifiedSettings)
                            ? normalizeGamificationSettings(existingGamifiedSettings)
                            : null
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [classroomId, existingGamifiedSettings, open]);

    const toggleSpecies = (id: string) => {
        setSelectedSpeciesIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((x) => x !== id);
            }

            if (
                typeof maxSpeciesAllowed === "number" &&
                maxSpeciesAllowed !== Number.POSITIVE_INFINITY &&
                prev.length >= maxSpeciesAllowed
            ) {
                toast({
                    title: t("negamonSettingsPlanLimitErrorTitle"),
                    description: t("negamonSettingsPlanLimitErrorDescription", {
                        limit: maxSpeciesAllowed,
                    }),
                    variant: "destructive",
                });
                return prev;
            }

            return [...prev, id];
        });
    };

    const allowedSpeciesSet = new Set(selectedSpeciesIds);
    const selectedSpeciesCatalog = DEFAULT_NEGAMON_SPECIES.filter((sp) =>
        selectedSpeciesIds.includes(sp.id)
    );
    const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name, "th"));

    const cleanStudentMonsters = (): Record<string, string> => {
        const validIds = new Set(students.map((st) => st.id));
        const next: Record<string, string> = {};
        for (const [sid, specId] of Object.entries(studentMonsters)) {
            if (validIds.has(sid) && allowedSpeciesSet.has(specId)) {
                next[sid] = specId;
            }
        }
        return next;
    };

    const randomAssignUnassigned = () => {
        if (selectedSpeciesCatalog.length === 0) {
            toast({ title: t("negamonSettingsToastNeedSpecies"), variant: "destructive" });
            return;
        }
        const next: Record<string, string> = { ...studentMonsters };
        let added = 0;
        for (const st of students) {
            const currentAssigned = next[st.id];
            if (currentAssigned && allowedSpeciesSet.has(currentAssigned)) continue;
            const pick = selectedSpeciesCatalog[Math.floor(Math.random() * selectedSpeciesCatalog.length)];
            next[st.id] = pick.id;
            added += 1;
        }
        setStudentMonsters(next);
        toast({
            title:
                added === 0
                    ? t("negamonSettingsToastAllHaveMonster")
                    : t("negamonSettingsToastAssignedN", { count: added }),
        });
    };

    const clearAllAssignments = () => {
        setStudentMonsters({});
        toast({ title: t("negamonSettingsToastClearedAssignments") });
    };

    const affectedStudentCount = (): number => {
        const allowedSet = new Set(selectedSpeciesIds);
        return Object.values(studentMonsters).filter(
            (specId) => specId && !allowedSet.has(specId)
        ).length;
    };

    const handleSave = () => {
        if (selectedSpeciesIds.length === 0) {
            toast({ title: t("negamonSettingsToastPickOneMonster"), variant: "destructive" });
            return;
        }

        if (planSpeciesInvalid) {
            const invalidNames = DEFAULT_NEGAMON_SPECIES.filter((s) =>
                disallowedSelectedSpeciesIds.includes(s.id)
            ).map((s) => s.name).join(", ");
            toast({
                title: t("negamonSettingsPlanDisallowedSpeciesTitle"),
                description: t("negamonSettingsPlanDisallowedSpeciesDescription", {
                    species: invalidNames,
                }),
                variant: "destructive",
            });
            return;
        }

        if (planLimitExceeded && typeof maxSpeciesAllowed === "number") {
            toast({
                title: t("negamonSettingsPlanLimitErrorTitle"),
                description: t("negamonSettingsPlanLimitErrorDescription", {
                    limit: maxSpeciesAllowed,
                }),
                variant: "destructive",
            });
            return;
        }

        const affected = affectedStudentCount();
        if (
            affected > 0 &&
            !window.confirm(t("negamonSettingsConfirmStripAssignments", { count: affected }))
        ) {
            return;
        }

        startTransition(async () => {
            const cleanedMonsters = cleanStudentMonsters();
            const newSettings: NegamonSettings = {
                enabled,
                allowStudentChoice,
                expPerPoint,
                expPerAttendance,
                species: DEFAULT_NEGAMON_SPECIES.filter((s) => selectedSpeciesIds.includes(s.id)),
                studentMonsters: cleanedMonsters,
                disabledMoves: disabledMoves.length > 0 ? disabledMoves : undefined,
            };

            try {
                const base = normalizeGamificationSettings(fetchedGamifiedSettings ?? {});
                const nextGamifiedSettings = {
                    ...base,
                    negamon: newSettings,
                };

                const res = await fetch(`/api/classrooms/${classroomId}/gamification-settings`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        gamifiedSettings: nextGamifiedSettings,
                    }),
                });

                if (!res.ok) {
                    const message = await getLocalizedErrorMessageFromResponse(
                        res,
                        "createSetFailTryAgain",
                        t,
                        language
                    );
                    throw new Error(message);
                }

                setFetchedGamifiedSettings(nextGamifiedSettings);
                onSaved(newSettings, nextGamifiedSettings);
                toast({ title: t("negamonSettingsToastSaved") });
                onOpenChange(false);
            } catch (error) {
                const message = error instanceof Error ? error.message : t("toastGenericError");
                toast({
                    title: message,
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1400px] w-[94vw] rounded-[2rem] max-h-[90vh] overflow-y-auto p-0 border-0 bg-white shadow-2xl">
                <div className="sticky top-0 z-10 px-6 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shrink-0 shadow-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black text-white">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
                                <Swords className="w-6 h-6" />
                            </div>
                            {t("negamonClassroomRpgTitle")}
                        </DialogTitle>
                        <DialogDescription className="text-purple-100 font-medium">
                            {t("negamonSettingsDialogDescription")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* ── Left Column: Config & Species Selection ── */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">{t("toolbarSectionGamification")}</h4>
                                <div className="flex items-center justify-between rounded-2xl bg-purple-50 border-2 border-purple-100 px-5 py-4 transition-all hover:border-purple-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                            <Zap className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <Label htmlFor="negamon-enabled" className="font-black text-purple-900 cursor-pointer text-base">
                                            {t("negamonSettingsEnableLabel")}
                                        </Label>
                                    </div>
                                    <Switch
                                        id="negamon-enabled"
                                        checked={enabled}
                                        onCheckedChange={setEnabled}
                                        className="data-[state=checked]:bg-purple-600"
                                    />
                                </div>
                            </div>

                            {enabled && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 hover:bg-slate-100/50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-slate-500" />
                                                <Label htmlFor="student-choice" className="font-bold text-slate-700 cursor-pointer text-sm">
                                                    {t("negamonSettingsStudentChoiceLabel")}
                                                </Label>
                                            </div>
                                            <Switch
                                                id="student-choice"
                                                checked={allowStudentChoice}
                                                onCheckedChange={setAllowStudentChoice}
                                            />
                                        </div>

                                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-5 py-4 space-y-4 hover:bg-slate-100/50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-amber-500" />
                                                    <Label className="font-black text-slate-700 text-sm italic">{t("negamonSettingsExpPerPointLabel")}</Label>
                                                </div>
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black px-3 py-1 rounded-full shadow-sm">
                                                    {t("negamonSettingsExpBadge", { amount: expPerPoint })}
                                                </Badge>
                                            </div>
                                            <Slider
                                                min={1} max={50} step={1}
                                                value={[expPerPoint]}
                                                onValueChange={([v]) => setExpPerPoint(v)}
                                                className="[&>[role=slider]]:bg-amber-500 [&>[role=slider]]:w-5 [&>[role=slider]]:h-5"
                                            />
                                        </div>

                                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-5 py-4 space-y-4 hover:bg-slate-100/50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4 text-sky-500" />
                                                    <Label className="font-black text-slate-700 text-sm italic">{t("negamonSettingsExpPerAttendanceLabel")}</Label>
                                                </div>
                                                <Badge className="bg-sky-100 text-sky-700 border-sky-200 font-black px-3 py-1 rounded-full shadow-sm">
                                                    {t("negamonSettingsExpBadge", { amount: expPerAttendance })}
                                                </Badge>
                                            </div>
                                            <Slider
                                                min={0} max={100} step={5}
                                                value={[expPerAttendance]}
                                                onValueChange={([v]) => setExpPerAttendance(v)}
                                                className="[&>[role=slider]]:bg-sky-500 [&>[role=slider]]:w-5 [&>[role=slider]]:h-5"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Settings2 className="w-4 h-4 text-slate-500" />
                                                <Label className="font-black text-slate-800 text-base uppercase tracking-tight">
                                                    {t("negamonSettingsAllowedMonstersLabel")}
                                                </Label>
                                            </div>
                                            <Badge variant="outline" className="font-bold border-purple-200 text-purple-700 bg-purple-50">
                                                {selectedSpeciesIds.length} Monsters Selected
                                            </Badge>
                                        </div>
                                        {currentPlanLimits && maxSpeciesAllowed !== Number.POSITIVE_INFINITY && (
                                            <div
                                                className={cn(
                                                    "rounded-2xl border px-4 py-3 text-sm",
                                                    planSpeciesInvalid || planLimitExceeded
                                                        ? "bg-rose-50 border-rose-200 text-rose-700"
                                                        : "bg-slate-50 border-slate-200 text-slate-600"
                                                )}
                                            >
                                                {planSpeciesInvalid
                                                    ? t("negamonSettingsPlanDisallowedSpeciesInfo", {
                                                          plan: currentPlan ?? "FREE",
                                                          species: DEFAULT_NEGAMON_SPECIES.filter((s) =>
                                                              disallowedSelectedSpeciesIds.includes(s.id)
                                                          )
                                                              .map((s) => s.name)
                                                              .join(", "),
                                                      })
                                                    : planLimitExceeded
                                                    ? t("negamonSettingsPlanLimitExceeded", {
                                                          plan: currentPlan ?? "FREE",
                                                          limit: maxSpeciesAllowed ?? 0,
                                                          excess: selectedSpeciesIds.length - (maxSpeciesAllowed ?? 0),
                                                      })
                                                    : t("negamonSettingsPlanAllowedSpeciesInfo", {
                                                          plan: currentPlan ?? "FREE",
                                                          limit: maxSpeciesAllowed ?? 0,
                                                          species: DEFAULT_NEGAMON_SPECIES.filter((s) =>
                                                              allowedSpeciesIds.has(s.id)
                                                          )
                                                              .slice(0, maxSpeciesAllowed ?? 0)
                                                              .map((s) => s.name)
                                                              .join(", "),
                                                      })}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {DEFAULT_NEGAMON_SPECIES.map((s) => {
                                                const selected = selectedSpeciesIds.includes(s.id);
                                                const rankFiveForm = s.forms[4];
                                                const speciesDisabled = !allowedSpeciesIds.has(s.id);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => toggleSpecies(s.id)}
                                                        disabled={speciesDisabled}
                                                        className={cn(
                                                            "group relative flex items-center gap-3 rounded-2xl p-3 border-2 transition-all text-left",
                                                            speciesDisabled
                                                                ? "border-slate-100 bg-slate-100/70 text-slate-400 cursor-not-allowed"
                                                                : selected
                                                                ? "border-purple-500 bg-purple-50/50 shadow-md transform scale-[1.02]"
                                                                : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-12 h-12 flex items-center justify-center shrink-0 rounded-xl border-2 transition-all",
                                                            selected ? "bg-white border-purple-200 shadow-sm" : "bg-slate-50 border-slate-100"
                                                        )}>
                                                            <NegamonFormIcon
                                                                icon={rankFiveForm?.icon ?? s.forms[1].icon}
                                                                label={s.name}
                                                                className="h-full w-full"
                                                                emojiClassName="text-3xl"
                                                                width={48}
                                                                height={48}
                                                                imageClassName="h-full w-full object-contain"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className={cn("font-black text-sm truncate tracking-tight", selected ? "text-purple-900" : "text-slate-700")}>{s.name}</p>
                                                                {speciesDisabled && (
                                                                    <Badge className="text-[8px] font-black px-1.5 py-0 border border-rose-200 bg-rose-50 text-rose-700 uppercase leading-tight">
                                                                        {t("negamonSettingsSpeciesNotAllowed")}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1 mt-1 overflow-x-hidden">
                                                                <Badge className={cn("text-[8px] font-black px-1.5 py-0 border leading-tight uppercase", TYPE_COLORS[s.type])}>
                                                                    {t(`monsterType_${s.type as MonsterType}`).replace(/.*\s/, "")}
                                                                </Badge>
                                                                {s.type2 && (
                                                                    <Badge className={cn("text-[8px] font-black px-1.5 py-0 border leading-tight uppercase", TYPE_COLORS[s.type2])}>
                                                                        {t(`monsterType_${s.type2 as MonsterType}`).replace(/.*\s/, "")}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                            selected ? "bg-purple-600 border-purple-600 shadow-sm" : "border-slate-200 group-hover:border-slate-300"
                                                        )}>
                                                            {selected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* ── Right Column: Move Manager & Assignments ── */}
                        {enabled && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6 lg:border-l lg:pl-8 border-slate-100"
                            >
                                {/* ── Move Manager ── */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                                            <EyeOff className="w-4 h-4 text-rose-500" />
                                        </div>
                                        <div>
                                            <Label className="font-black text-slate-800 text-base uppercase tracking-tight">
                                                {t("negamonMoveManagerLabel")}
                                            </Label>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                {t("negamonMoveManagerHint")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {DEFAULT_NEGAMON_SPECIES.filter((s) => selectedSpeciesIds.includes(s.id)).map((species) => {
                                            const isExpanded = expandedSpecies === species.id;
                                            const speciesDisabled = species.moves.filter((m) => disabledMoves.includes(m.id)).length;
                                            return (
                                                <div key={species.id} className={cn(
                                                    "rounded-2xl border-2 overflow-hidden transition-all",
                                                    isExpanded ? "border-slate-400 shadow-md ring-4 ring-slate-100" : "border-slate-100"
                                                )}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedSpecies(isExpanded ? null : species.id)}
                                                        className={cn(
                                                            "flex w-full items-center gap-3 px-4 py-3 transition-colors text-left font-black",
                                                            isExpanded ? "bg-slate-800 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                                                        )}
                                                    >
                                                        <NegamonFormIcon
                                                            icon={species.forms[1]?.icon ?? species.forms[0].icon}
                                                            label={species.name}
                                                            emojiClassName="text-xl"
                                                            width={28}
                                                            height={28}
                                                            imageClassName="max-h-7 max-w-7 object-contain"
                                                        />
                                                        <span className="flex-1 text-sm">{species.name}</span>
                                                        {speciesDisabled > 0 && (
                                                            <span className={cn(
                                                                "rounded-full px-2 py-0.5 text-[10px] font-black",
                                                                isExpanded ? "bg-white text-slate-800" : "bg-rose-100 text-rose-700"
                                                            )}>
                                                                {speciesDisabled} OFF
                                                            </span>
                                                        )}
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="divide-y divide-slate-100 bg-white">
                                                            {species.moves
                                                                .sort((a, b) => a.learnRank - b.learnRank)
                                                                .map((move) => {
                                                                    const isDisabled = disabledMoves.includes(move.id);
                                                                    const moveName = t(`move_${move.id.replace(/-/g, "_")}` as Parameters<typeof t>[0]) || move.name;
                                                                    return (
                                                                        <button
                                                                            key={move.id}
                                                                            type="button"
                                                                            onClick={() => setDisabledMoves((prev) =>
                                                                                prev.includes(move.id)
                                                                                    ? prev.filter((id) => id !== move.id)
                                                                                    : [...prev, move.id]
                                                                            )}
                                                                            className={cn(
                                                                                "flex w-full items-center gap-4 px-4 py-3 transition-all text-left group",
                                                                                isDisabled ? "bg-rose-50/40" : "hover:bg-slate-50"
                                                                            )}
                                                                        >
                                                                            <div className={cn(
                                                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                                                                                isDisabled ? "border-rose-500 bg-rose-500 ring-4 ring-rose-100" : "border-slate-200 group-hover:border-slate-300"
                                                                            )}>
                                                                                {isDisabled && <EyeOff className="w-3 h-3 text-white stroke-[3px]" />}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className={cn("text-xs font-black uppercase tracking-tight", isDisabled ? "text-rose-600 line-through opacity-70" : "text-slate-800")}>
                                                                                    {moveName}
                                                                                </p>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Rank {move.learnRank}</span>
                                                                                    <Badge className={cn("text-[8px] font-black px-1.5 py-0 border uppercase leading-tight", TYPE_COLORS[move.type] ?? "bg-slate-50 text-slate-500")}>
                                                                                        {t(`monsterType_${move.type as MonsterType}`).replace(/.*\s/, "")}
                                                                                    </Badge>
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── Student Assignments ── */}
                                <div className="space-y-4 pt-2">
                                    <div className="rounded-3xl border-2 border-violet-100 bg-gradient-to-br from-violet-50/50 to-white p-6 shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Users className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-slate-800 text-base uppercase tracking-tight">
                                                        {t("negamonSettingsAssignSectionTitle")}
                                                    </h5>
                                                    <p className="text-[11px] font-bold text-violet-600 uppercase tracking-widest mt-0.5">
                                                        {t("negamonSettingsAssignSectionHint")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-xl px-3 text-[10px] font-black uppercase text-violet-600 hover:bg-violet-100"
                                                    onClick={randomAssignUnassigned}
                                                    disabled={students.length === 0 || selectedSpeciesIds.length === 0}
                                                >
                                                    <Shuffle className="mr-1.5 h-3.5 w-3.5" />
                                                    {t("negamonSettingsRandomFill")}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-xl px-3 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-50"
                                                    onClick={clearAllAssignments}
                                                >
                                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                    {t("negamonSettingsClearAll")}
                                                </Button>
                                            </div>
                                        </div>

                                        {sortedStudents.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center p-12 text-center bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
                                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                                    <Users className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <p className="text-sm font-black text-slate-400 uppercase tracking-tight">
                                                    {t("negamonSettingsAddStudentsFirst")}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="max-h-[min(50vh,400px)] space-y-2 overflow-y-auto pr-3 custom-scrollbar">
                                                {sortedStudents.map((st) => {
                                                    const assigned = studentMonsters[st.id];
                                                    const selectValue = assigned && allowedSpeciesSet.has(assigned)
                                                        ? assigned
                                                        : UNASSIGNED_VALUE;
                                                    const selectedSp = selectedSpeciesCatalog.find((x) => x.id === assigned);

                                                    return (
                                                        <div
                                                            key={st.id}
                                                            className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm hover:shadow-md transition-all sm:flex-row sm:items-center sm:justify-between group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-500 shrink-0">
                                                                    {st.name.charAt(0)}
                                                                </div>
                                                                <span className="truncate text-sm font-black text-slate-700">
                                                                    {st.name}
                                                                </span>
                                                            </div>
                                                            <Select
                                                                value={selectValue}
                                                                onValueChange={(v) => {
                                                                    setStudentMonsters((prev) => {
                                                                        const next = { ...prev };
                                                                        if (v === UNASSIGNED_VALUE) {
                                                                            delete next[st.id];
                                                                        } else {
                                                                            next[st.id] = v;
                                                                        }
                                                                        return next;
                                                                    });
                                                                }}
                                                            >
                                                                <SelectTrigger
                                                                    className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 font-black text-xs sm:max-w-[200px] hover:border-violet-300 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {selectedSp ? (
                                                                            <>
                                                                                <NegamonFormIcon
                                                                                    icon={selectedSp.forms[1]?.icon ?? selectedSp.forms[0].icon}
                                                                                    label={selectedSp.name}
                                                                                    emojiClassName="text-lg"
                                                                                    width={24}
                                                                                    height={24}
                                                                                    imageClassName="h-6 w-6 object-contain"
                                                                                />
                                                                                <SelectValue />
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-slate-400">{t("negamonSettingsUnassigned")}</span>
                                                                        )}
                                                                    </div>
                                                                </SelectTrigger>
                                                                    <SelectContent className="rounded-xl border-2">
                                                                        <SelectItem value={UNASSIGNED_VALUE}>
                                                                            <span className="text-slate-400 font-bold">{t("negamonSettingsUnassigned")}</span>
                                                                        </SelectItem>
                                                                        {selectedSpeciesCatalog.map((sp) => (
                                                                            <SelectItem key={sp.id} value={sp.id}>
                                                                                <span className="flex items-center gap-2 py-0.5">
                                                                                    <NegamonFormIcon
                                                                                    icon={sp.forms[1]?.icon ?? sp.forms[0].icon}
                                                                                    label={sp.name}
                                                                                    emojiClassName="text-2xl"
                                                                                    width={32}
                                                                                    height={32}
                                                                                    imageClassName="h-8 w-8 object-contain"
                                                                                />
                                                                                <span className="font-black text-slate-700">{sp.name}</span>
                                                                            </span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 bg-slate-50/90 backdrop-blur-md border-t border-slate-100 p-6 z-10">
                    <DialogFooter className="flex-row items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-2xl h-12 px-6 font-black uppercase tracking-tight text-slate-500 border-2 hover:bg-white transition-all"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isPending || planLimitExceeded || planSpeciesInvalid}
                            className="rounded-2xl h-12 px-10 font-black uppercase tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-purple-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            {isPending ? t("savingChanges") : t("save")}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
