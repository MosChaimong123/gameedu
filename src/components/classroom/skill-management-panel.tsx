"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Heart, Star, Zap, ThumbsUp, Brain, Trophy,
    AlertCircle, Plus, Loader2, Trash2, ArrowLeft,
} from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { getThemeBgStyle, getThemeHorizontalBgClass } from "@/lib/classroom-utils";
import { useToast } from "@/components/ui/use-toast";

interface Skill {
    id: string;
    name: string;
    weight: number;
    type: string;
    icon?: string | null;
}

export interface SkillManagementPanelProps {
    classId: string;
    skills: Skill[];
    onSkillsChanged?: (skills: Skill[]) => void;
    theme?: string;
    /** Return to the “give points” view in the same dialog */
    onBack: () => void;
}

const iconMap = {
    "heart": Heart,
    "star": Star,
    "zap": Zap,
    "thumbs-up": ThumbsUp,
    "hand": ThumbsUp,
    "brain": Brain,
    "trophy": Trophy,
    "default": Star
} as const;

export function SkillManagementPanel({
    classId,
    skills,
    onSkillsChanged,
    theme = "",
    onBack,
}: SkillManagementPanelProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [skillToDelete, setSkillToDelete] = useState<string | null>(null);
    const [newSkill, setNewSkill] = useState<{
        name: string;
        weight: string;
        type: "POSITIVE" | "NEEDS_WORK";
        icon: string;
    }>({ name: "", weight: "", type: "POSITIVE", icon: "star" });

    const positiveSkills = skills.filter(s => s.type === "POSITIVE");
    const needsWorkSkills = skills.filter(s => s.type === "NEEDS_WORK");

    const handleAddSkill = async (type: "POSITIVE" | "NEEDS_WORK") => {
        if (!newSkill.name || !newSkill.weight) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/skills`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSkill.name,
                    weight: parseInt(newSkill.weight, 10),
                    type,
                    icon: newSkill.icon
                })
            });
            if (res.ok) {
                const createdSkill = await res.json() as Skill;
                setNewSkill({ name: "", weight: "", type: "POSITIVE", icon: "star" });
                toast({
                    title: t("toastSkillAddSuccessTitle"),
                    description: t("toastSkillAddSuccessDesc"),
                });
                onSkillsChanged?.([...skills, createdSkill]);
            } else {
                throw new Error();
            }
        } catch (error) {
            console.error("Failed to add skill", error);
            toast({
                title: t("toastSkillAddFailTitle"),
                description: t("toastSkillAddFailDesc"),
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDeleteSkill = async () => {
        if (!skillToDelete) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/skills/${skillToDelete}`, {
                method: "DELETE"
            });
            if (res.ok) {
                onSkillsChanged?.(skills.filter((skill) => skill.id !== skillToDelete));
                setSkillToDelete(null);
                toast({
                    title: t("toastSkillDeleteSuccessTitle"),
                    description: t("toastSkillDeleteSuccessDesc"),
                });
            } else {
                throw new Error();
            }
        } catch (error) {
            console.error("Failed to delete skill", error);
            toast({
                title: t("toastSkillDeleteFailTitle"),
                description: t("toastSkillDeleteFailDesc"),
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderSkillCard = (skill: Skill) => {
        const isPositive = skill.type === "POSITIVE";
        const Icon = (skill.icon && iconMap[skill.icon as keyof typeof iconMap]) || (isPositive ? iconMap["default"] : AlertCircle);

        return (
            <motion.div
                key={skill.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                className={cn(
                    "group relative flex h-full min-h-[11rem] flex-col items-center gap-3 rounded-2xl border-2 bg-white p-4 shadow-sm transition-all sm:min-h-[13rem] sm:gap-4 sm:p-5",
                    isPositive ? "border-emerald-100 hover:border-emerald-200 hover:shadow-md" : "border-rose-100 hover:border-rose-200 hover:shadow-md"
                )}
            >
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 z-20 h-9 w-9 text-slate-400 opacity-80 hover:bg-rose-50 hover:text-rose-600 hover:opacity-100"
                    onClick={() => setSkillToDelete(skill.id)}
                    aria-label={t("confirmDelete")}
                >
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                <div
                    className={cn(
                        "relative z-10 rounded-2xl p-4 shadow-inner transition-transform group-hover:scale-[1.02] sm:p-5",
                        isPositive
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                    )}
                >
                    <Icon className="h-9 w-9 sm:h-11 sm:w-11" />
                </div>

                <div className="flex w-full flex-1 flex-col items-center justify-center px-1 text-center">
                    <h4 className="mb-3 line-clamp-3 break-words text-base font-bold leading-snug text-slate-900 sm:text-lg">
                        {skill.name}
                    </h4>
                    <div
                        className={cn(
                            "rounded-full px-4 py-2 text-sm font-bold text-white shadow sm:text-base",
                            isPositive ? "bg-emerald-600 shadow-emerald-100" : "bg-rose-600 shadow-rose-100"
                        )}
                    >
                        {isPositive ? `+${skill.weight}` : skill.weight}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-[inherit] bg-[#faf8f5]">
                <header
                    className={cn(
                        "flex shrink-0 flex-col gap-3 border-b border-amber-100/90 px-4 py-3 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4",
                        getThemeHorizontalBgClass(theme)
                    )}
                    style={getThemeBgStyle(theme)}
                >
                    <Button
                        type="button"
                        variant="ghost"
                        className="order-2 h-auto w-full justify-start gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 text-left text-white hover:bg-white/20 sm:order-1 sm:w-auto sm:px-4"
                        onClick={onBack}
                    >
                        <ArrowLeft className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-bold sm:text-base">{t("skillManagementBack")}</span>
                    </Button>
                    <div className="order-1 min-w-0 sm:order-2 sm:flex-1 sm:text-center">
                        <h2 className="text-lg font-extrabold tracking-tight text-white drop-shadow-sm sm:text-2xl">
                            {t("skillManagement")}
                        </h2>
                        <p className="mt-0.5 text-xs font-medium text-white/90 sm:text-sm">
                            {t("skillManagementSubtitle")}
                        </p>
                    </div>
                    <div className="order-3 hidden w-[min(100%,12rem)] shrink-0 sm:block" aria-hidden />
                </header>

                <main className="custom-scrollbar-thick min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6">
                    <div className="mx-auto max-w-6xl space-y-8 pb-8 sm:space-y-10 sm:pb-12 lg:max-w-7xl">
                        <section className="space-y-5 sm:space-y-7">
                            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                                <div className="hidden h-10 w-1 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)] sm:block sm:h-12" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                                        {t("positiveFeedback")}
                                    </h3>
                                    <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                                        {t("positiveFeedbackDesc")}
                                    </p>
                                </div>
                                <div className="w-fit shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow">
                                    {positiveSkills.length} {t("skillsLabel")}
                                </div>
                            </header>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                                <AnimatePresence mode="popLayout">
                                    {positiveSkills.map(renderSkillCard)}
                                </AnimatePresence>
                            </div>

                            <div className="rounded-2xl border-2 border-dashed border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 p-4 shadow-inner sm:rounded-3xl sm:p-6 lg:p-8">
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end lg:gap-5">
                                    <div className="lg:col-span-6 xl:col-span-7">
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-emerald-700">
                                            {t("skillQuickAddNameLabel")}
                                        </label>
                                        <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/80 p-3 transition-colors focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 sm:p-4">
                                            <Input
                                                placeholder={t("skillAddPositivePlaceholder")}
                                                value={newSkill.type === "POSITIVE" ? newSkill.name : ""}
                                                onChange={e => setNewSkill({ ...newSkill, name: e.target.value, type: "POSITIVE" })}
                                                className="h-11 border-0 bg-transparent text-base font-bold text-slate-900 focus-visible:ring-0 sm:h-14 sm:text-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-3">
                                        <label className="mb-2 block text-center text-xs font-bold uppercase tracking-wide text-emerald-700 lg:text-left">
                                            {t("weightPlaceholder")}
                                        </label>
                                        <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/80 p-3 transition-colors focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 sm:p-4">
                                            <Input
                                                type="number"
                                                placeholder="+1"
                                                value={newSkill.type === "POSITIVE" ? newSkill.weight : ""}
                                                onChange={e => setNewSkill({ ...newSkill, weight: e.target.value, type: "POSITIVE" })}
                                                className="h-11 border-0 bg-transparent text-center text-2xl font-black text-emerald-700 focus-visible:ring-0 sm:h-14 sm:text-3xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-3 xl:col-span-2">
                                        <Button
                                            type="button"
                                            className="h-12 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-200/50 hover:bg-emerald-700 sm:h-14 sm:text-lg"
                                            onClick={() => handleAddSkill("POSITIVE")}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? <Loader2 className="h-7 w-7 animate-spin" /> : <Plus className="h-7 w-7" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <Separator className="bg-amber-100" />

                        <section className="space-y-5 sm:space-y-7">
                            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                                <div className="hidden h-10 w-1 shrink-0 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.35)] sm:block sm:h-12" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                                        {t("needsWorkFeedback")}
                                    </h3>
                                    <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                                        {t("needsWorkFeedbackDesc")}
                                    </p>
                                </div>
                                <div className="w-fit shrink-0 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-bold text-white shadow">
                                    {needsWorkSkills.length} {t("skillsLabel")}
                                </div>
                            </header>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                                <AnimatePresence mode="popLayout">
                                    {needsWorkSkills.map(renderSkillCard)}
                                </AnimatePresence>
                            </div>

                            <div className="rounded-2xl border-2 border-dashed border-rose-200/80 bg-gradient-to-br from-white to-rose-50/40 p-4 shadow-inner sm:rounded-3xl sm:p-6 lg:p-8">
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end lg:gap-5">
                                    <div className="lg:col-span-6 xl:col-span-7">
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-rose-700">
                                            {t("skillInfractionNameLabel")}
                                        </label>
                                        <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/80 p-3 transition-colors focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100 sm:p-4">
                                            <Input
                                                placeholder={t("skillAddNeedsWorkPlaceholder")}
                                                value={newSkill.type === "NEEDS_WORK" ? newSkill.name : ""}
                                                onChange={e => setNewSkill({ ...newSkill, name: e.target.value, type: "NEEDS_WORK" })}
                                                className="h-11 border-0 bg-transparent text-base font-bold text-slate-900 focus-visible:ring-0 sm:h-14 sm:text-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-3">
                                        <label className="mb-2 block text-center text-xs font-bold uppercase tracking-wide text-rose-700 lg:text-left">
                                            {t("weightPlaceholder")}
                                        </label>
                                        <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/80 p-3 transition-colors focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100 sm:p-4">
                                            <Input
                                                type="number"
                                                placeholder="-1"
                                                value={newSkill.type === "NEEDS_WORK" ? newSkill.weight : ""}
                                                onChange={e => setNewSkill({ ...newSkill, weight: e.target.value, type: "NEEDS_WORK" })}
                                                className="h-11 border-0 bg-transparent text-center text-2xl font-black text-rose-700 focus-visible:ring-0 sm:h-14 sm:text-3xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-3 xl:col-span-2">
                                        <Button
                                            type="button"
                                            className="h-12 w-full rounded-2xl bg-rose-600 text-base font-bold text-white shadow-lg shadow-rose-200/50 hover:bg-rose-700 sm:h-14 sm:text-lg"
                                            onClick={() => handleAddSkill("NEEDS_WORK")}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? <Loader2 className="h-7 w-7 animate-spin" /> : <Plus className="h-7 w-7" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>

            <Dialog open={!!skillToDelete} onOpenChange={(val) => !val && setSkillToDelete(null)}>
                <DialogContent className="z-[200] max-w-[min(100vw-1.5rem,28rem)] rounded-3xl border-0 p-0 shadow-2xl">
                    <div className="flex flex-col items-center px-6 py-8 text-center sm:px-10 sm:py-10">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-rose-100 bg-rose-50 shadow-inner">
                            <Trash2 className="h-9 w-9 text-rose-600" />
                        </div>
                        <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900">
                            {t("deleteSkillTitle")}
                        </h3>
                        <p className="mb-8 text-base font-medium leading-relaxed text-slate-600">
                            {t("deleteSkillBody")}
                        </p>
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-12 flex-1 rounded-2xl border-2 font-bold"
                                onClick={() => setSkillToDelete(null)}
                                disabled={isSubmitting}
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                type="button"
                                className="h-12 flex-1 rounded-2xl bg-rose-600 font-bold text-white hover:bg-rose-700"
                                onClick={confirmDeleteSkill}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : t("confirmDelete")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
