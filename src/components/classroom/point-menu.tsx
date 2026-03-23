"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skill } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Heart, Star, Zap, ThumbsUp, Brain, Trophy, AlertCircle, X, Plus, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { SkillManagementModal } from "./skill-management-modal";

interface PointMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentName: string;
    skills: Skill[];
    onSelectSkill: (skillId: string, weight: number) => void;
    loading?: boolean;
    classId: string;
    onSkillsChanged?: () => void;
}

// Map icon strings to Lucide components
const iconMap: Record<string, any> = {
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
    onSkillsChanged
}: PointMenuProps) {
    const { t } = useLanguage();
    const [isManagementOpen, setIsManagementOpen] = useState(false);

    const positiveSkills = skills.filter(s => s.type === "POSITIVE");
    const needsWorkSkills = skills.filter(s => s.type === "NEEDS_WORK");



    const renderSkillButton = (skill: Skill, isPositive: boolean) => {
        const Icon = (skill.icon && iconMap[skill.icon as keyof typeof iconMap]) || (isPositive ? iconMap["default"] : AlertCircle);
        return (
            <motion.div 
                key={skill.id} 
                className="relative group h-full"
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
            >
                <div
                    className={cn(
                        "h-full flex flex-col items-center gap-4 px-8 py-7 transition-all w-full cursor-pointer rounded-[3rem] border-2 bg-white shadow-sm relative group-hover:shadow-xl",
                        isPositive 
                            ? "hover:border-emerald-400 border-slate-100" 
                            : "hover:border-rose-400 border-slate-100",
                        loading && "pointer-events-none opacity-80"
                    )}
                    onClick={() => onSelectSkill(skill.id, skill.weight)}
                >
                    {/* Background decoration */}
                    <div className={cn(
                        "absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity",
                        isPositive ? "bg-emerald-500" : "bg-rose-500"
                    )} />

                    <div className={cn(
                        "p-4 rounded-full shadow-inner relative z-10", 
                        isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        <Icon className="w-8 h-8 drop-shadow-sm" />
                    </div>
                    
                    <span className="font-bold text-[13px] text-slate-700 text-center leading-tight min-h-[40px] flex items-center justify-center px-1">
                        {skill.name}
                    </span>

                    <div className={cn(
                        "mt-auto text-[14px] font-black px-4 py-1.5 rounded-2xl shadow-md border-b-4 transition-transform group-hover:scale-110", 
                        isPositive 
                            ? "bg-emerald-500 text-white border-emerald-700 shadow-emerald-200" 
                            : "bg-rose-500 text-white border-rose-700 shadow-rose-200"
                    )}>
                        {isPositive ? `+${skill.weight}` : skill.weight}
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderAddForm = (type: "POSITIVE" | "NEEDS_WORK") => null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-[95vw] p-0 overflow-hidden bg-slate-50 border-0 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.4)] rounded-[4rem] h-[95vh] flex flex-col">

                <DialogHeader className="p-12 pb-8 relative z-20 bg-white/70 backdrop-blur-xl border-b-2 border-slate-100 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">
                            {t("giveFeedbackTo")} <span className="text-indigo-600 bg-indigo-50 px-4 py-1 rounded-2xl ml-2 inline-block border-2 border-indigo-100/50">{studentName}</span>
                        </DialogTitle>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl border-2 font-black transition-all bg-white text-slate-600 hover:text-indigo-600 py-6 px-6"
                            onClick={() => setIsManagementOpen(true)}
                        >
                            {t("editSkills") || "จัดการทักษะ"}
                        </Button>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="positive" className="flex-1 flex flex-col overflow-hidden px-12 pb-12">

                    <TabsList className="grid w-full grid-cols-2 p-2 bg-slate-200/50 rounded-[2.5rem] h-auto mb-6 border-2 border-slate-100/50">
                        <TabsTrigger 
                            value="positive" 
                            className="rounded-[2rem] py-4 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:font-black text-slate-500 font-bold text-lg transition-all"
                        >
                            {t("positiveFeedback")}
                        </TabsTrigger>
                        <TabsTrigger 
                            value="needs_work" 
                            className="rounded-[2rem] py-4 data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-lg data-[state=active]:font-black text-slate-500 font-bold text-lg transition-all"
                        >
                            {t("needsWorkFeedback")}
                        </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                        <TabsContent value="positive" className="flex-1 overflow-y-auto pr-2 custom-scrollbar focus-visible:outline-none">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 p-2"
                            >
                                {positiveSkills.map((skill) => renderSkillButton(skill, true))}
                                {positiveSkills.length === 0 && (
                                    <div className="col-span-full text-center py-20 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                                        <Star className="w-12 h-12 text-slate-300 mb-4" />
                                        <p className="text-slate-400 font-bold italic text-lg">
                                            {t("noSkillsConfigured")}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </TabsContent>

                        <TabsContent value="needs_work" className="flex-1 overflow-y-auto pr-2 custom-scrollbar focus-visible:outline-none">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 p-2"
                            >
                                {needsWorkSkills.map((skill) => renderSkillButton(skill, false))}
                                {needsWorkSkills.length === 0 && (
                                    <div className="col-span-full text-center py-20 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                                        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                                        <p className="text-slate-400 font-bold italic text-lg">
                                            {t("noSkillsConfigured")}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </TabsContent>
                    </AnimatePresence>
                </Tabs>
            </DialogContent>
            
            <SkillManagementModal 
                open={isManagementOpen}
                onOpenChange={setIsManagementOpen}
                classId={classId}
                skills={skills as any}
                onSkillsChanged={onSkillsChanged}
            />
        </Dialog>
    );
}
