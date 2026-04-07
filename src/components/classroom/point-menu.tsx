"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, Star, Zap, ThumbsUp, Brain, Trophy, AlertCircle } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { motion, AnimatePresence } from "framer-motion";
import { SkillManagementPanel } from "./skill-management-panel";

interface PointMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentName: string;
    skills: Array<{
        id: string;
        name: string;
        type: string;
        weight: number;
        icon?: string | null;
    }>;
    onSelectSkill: (skillId: string, weight: number) => void;
    loading?: boolean;
    classId: string;
    onSkillsChanged?: (skills: Array<{
        id: string;
        name: string;
        type: string;
        weight: number;
        icon?: string | null;
    }>) => void;
    /** Matches classroom theme for skill manager header */
    theme?: string;
}

// Map icon strings to Lucide components
const iconMap: Record<string, typeof Heart> = {
    "heart": Heart,
    "star": Star,
    "zap": Zap,
    "hand": ThumbsUp,
    "brain": Brain,
    "trophy": Trophy,
    "muscle": Zap,
    "help": Heart,
    "task": Star,
    "team": Trophy,
    "default": Star
};

export function PointMenu({
    open,
    onOpenChange,
    studentName,
    skills,
    onSelectSkill,
    loading,
    classId,
    onSkillsChanged,
    theme = "",
}: PointMenuProps) {
    const { t } = useLanguage();
    const [manageMode, setManageMode] = useState(false);

    const positiveSkills = skills.filter(s => s.type === "POSITIVE");
    const needsWorkSkills = skills.filter(s => s.type === "NEEDS_WORK");

    const renderSkillButton = (skill: PointMenuProps["skills"][number], isPositive: boolean, index: number) => {
        const Icon = (skill.icon && iconMap[skill.icon as keyof typeof iconMap]) || (isPositive ? iconMap["default"] : AlertCircle);
        const stableKey = skill.id || `${isPositive ? "pos" : "nw"}-${index}-${skill.name}`;
        return (
            <motion.div 
                key={stableKey} 
                className="group relative h-full"
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
            >
                <div
                    className={cn(
                        "relative flex h-full w-full cursor-pointer flex-col items-center gap-4 rounded-[3rem] border-2 bg-white px-8 py-7 shadow-sm transition-all group-hover:shadow-xl",
                        isPositive 
                            ? "border-slate-100 hover:border-emerald-400" 
                            : "border-slate-100 hover:border-rose-400",
                        loading && "pointer-events-none opacity-80"
                    )}
                    onClick={() => onSelectSkill(skill.id, skill.weight)}
                >
                    <div className={cn(
                        "absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl opacity-0 transition-opacity group-hover:opacity-20",
                        isPositive ? "bg-emerald-500" : "bg-rose-500"
                    )} />

                    <div className={cn(
                        "relative z-10 rounded-full p-4 shadow-inner", 
                        isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        <Icon className="h-8 w-8 drop-shadow-sm" />
                    </div>
                    
                    <span className="flex min-h-[40px] items-center justify-center px-1 text-center text-[13px] font-bold leading-tight text-slate-700">
                        {skill.name}
                    </span>

                    <div className={cn(
                        "mt-auto rounded-2xl border-b-4 px-4 py-1.5 text-[14px] font-black shadow-md transition-transform group-hover:scale-110", 
                        isPositive 
                            ? "border-emerald-700 bg-emerald-500 text-white shadow-emerald-200" 
                            : "border-rose-700 bg-rose-500 text-white shadow-rose-200"
                    )}>
                        {isPositive ? `+${skill.weight}` : skill.weight}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) setManageMode(false);
                onOpenChange(next);
            }}
        >
            <DialogContent className="flex h-[min(95vh,1080px)] w-[min(98vw,1920px)] max-w-[min(98vw,1920px)] flex-col overflow-hidden rounded-[4rem] border-0 bg-slate-50 p-0 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.4)] sm:max-w-[min(98vw,1920px)]">
                {manageMode ? (
                    <SkillManagementPanel
                        classId={classId}
                        skills={skills}
                        theme={theme}
                        onSkillsChanged={onSkillsChanged}
                        onBack={() => setManageMode(false)}
                    />
                ) : (
                    <>
                        <DialogHeader className="relative z-20 flex-shrink-0 border-b-2 border-slate-100 bg-white/70 p-8 pb-6 backdrop-blur-xl sm:p-10 lg:p-12 sm:pb-8">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <DialogTitle className="text-2xl font-black tracking-tighter text-slate-800 sm:text-3xl">
                                    {t("giveFeedbackTo")}{" "}
                                    <span className="ml-0 inline-block rounded-2xl border-2 border-indigo-100/50 bg-indigo-50 px-3 py-1 text-indigo-600 sm:ml-2">
                                        {studentName}
                                    </span>
                                </DialogTitle>
                                <Button 
                                    type="button"
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-xl border-2 bg-white py-6 font-black text-slate-600 transition-all hover:text-indigo-600 px-6"
                                    onClick={() => setManageMode(true)}
                                >
                                    {t("editSkills")}
                                </Button>
                            </div>
                        </DialogHeader>

                        <Tabs defaultValue="positive" className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-10 sm:px-10 lg:px-14">
                            <TabsList className="mb-6 grid h-auto w-full grid-cols-2 rounded-[2.5rem] border-2 border-slate-100/50 bg-slate-200/50 p-2">
                                <TabsTrigger 
                                    value="positive" 
                                    className="rounded-[2rem] py-4 text-lg font-bold text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:font-black data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg"
                                >
                                    {t("positiveFeedback")}
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="needs_work" 
                                    className="rounded-[2rem] py-4 text-lg font-bold text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:font-black data-[state=active]:text-rose-600 data-[state=active]:shadow-lg"
                                >
                                    {t("needsWorkFeedback")}
                                </TabsTrigger>
                            </TabsList>

                            <AnimatePresence mode="wait">
                                <TabsContent key="tab-positive" value="positive" className="custom-scrollbar flex-1 overflow-y-auto pr-2 focus-visible:outline-none">
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="grid grid-cols-2 gap-6 p-2 sm:grid-cols-3 sm:gap-8 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                                    >
                                        {positiveSkills.map((skill, i) => renderSkillButton(skill, true, i))}
                                        {positiveSkills.length === 0 && (
                                            <div className="col-span-full flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-white/50 py-20 text-center">
                                                <Star className="mb-4 h-12 w-12 text-slate-300" />
                                                <p className="text-lg font-bold italic text-slate-400">
                                                    {t("noSkillsConfigured")}
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                </TabsContent>

                                <TabsContent key="tab-needs-work" value="needs_work" className="custom-scrollbar flex-1 overflow-y-auto pr-2 focus-visible:outline-none">
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="grid grid-cols-2 gap-6 p-2 sm:grid-cols-3 sm:gap-8 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                                    >
                                        {needsWorkSkills.map((skill, i) => renderSkillButton(skill, false, i))}
                                        {needsWorkSkills.length === 0 && (
                                            <div className="col-span-full flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-white/50 py-20 text-center">
                                                <AlertCircle className="mb-4 h-12 w-12 text-slate-300" />
                                                <p className="text-lg font-bold italic text-slate-400">
                                                    {t("noSkillsConfigured")}
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                </TabsContent>
                            </AnimatePresence>
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
