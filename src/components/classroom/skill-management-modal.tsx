"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
    Heart, Star, Zap, ThumbsUp, Brain, Trophy, 
    AlertCircle, Plus, Loader2, Trash2, Settings2
} from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";

interface Skill {
    id: string;
    name: string;
    weight: number;
    type: string;
    icon?: string | null;
}

interface SkillManagementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    skills: Skill[];
    onSkillsChanged?: () => void;
}

const iconMap = {
    "heart": Heart,
    "star": Star,
    "zap": Zap,
    "thumbs-up": ThumbsUp,
    "brain": Brain,
    "trophy": Trophy,
    "default": Star
};

export function SkillManagementModal({ 
    open, 
    onOpenChange, 
    classId, 
    skills, 
    onSkillsChanged 
}: SkillManagementModalProps) {
    const { t } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [skillToDelete, setSkillToDelete] = useState<string | null>(null);
    const [newSkill, setNewSkill] = useState({ name: "", weight: "", type: "POSITIVE", icon: "star" });

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
                    weight: parseInt(newSkill.weight),
                    type,
                    icon: newSkill.icon
                })
            });
            if (res.ok) {
                setNewSkill({ name: "", weight: "", type: "POSITIVE", icon: "star" });
                onSkillsChanged?.();
            }
        } catch (error) {
            console.error("Failed to add skill", error);
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
                onSkillsChanged?.();
                setSkillToDelete(null);
            }
        } catch (error) {
            console.error("Failed to delete skill", error);
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 flex flex-col items-center gap-6 relative group hover:border-indigo-200 transition-all shadow-sm hover:shadow-2xl h-full min-h-[320px]"
            >
                <div className={cn(
                    "p-7 rounded-[2rem] shadow-xl relative z-10 transition-transform group-hover:scale-110",
                    isPositive ? "bg-emerald-50 text-emerald-600 shadow-emerald-100" : "bg-rose-50 text-rose-600 shadow-rose-100"
                )}>
                    <Icon className="w-14 h-14" />
                </div>
                
                <div className="text-center w-full px-2 flex-1 flex flex-col justify-center">
                    <h4 className="font-black text-slate-800 text-2xl leading-tight mb-4 break-words px-4">{skill.name}</h4>
                    <div className={cn(
                        "text-xl font-black px-8 py-3 rounded-2xl mx-auto shadow-md transform transition-transform group-hover:scale-110",
                        isPositive ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-rose-500 text-white shadow-rose-200"
                    )}>
                        {isPositive ? `+${skill.weight}` : skill.weight}
                    </div>
                </div>

                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute top-4 right-4 rounded-full w-14 h-14 text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all z-20"
                    onClick={() => setSkillToDelete(skill.id)}
                >
                    <Trash2 className="w-7 h-7" />
                </Button>
            </motion.div>
        );
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent 
                    className="sm:max-w-none w-screen h-screen p-0 m-0 overflow-hidden bg-slate-50 border-0 shadow-none rounded-none flex flex-col fixed inset-0 z-[100] translate-x-0 translate-y-0 left-0 top-0"
                    showCloseButton={false}
                >
                    {/* Sticky Header */}
                    <header className="px-16 py-10 bg-white border-b-4 border-slate-100 flex-shrink-0 relative z-30 shadow-sm">
                        <div className="max-w-[1800px] mx-auto flex justify-between items-center">
                            <div className="flex items-center gap-8">
                                <div className="p-6 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                                    <Settings2 className="w-10 h-10" />
                                </div>
                                <div>
                                    <DialogTitle className="text-5xl font-black tracking-tighter text-slate-800 mb-2">
                                        {t("skillManagement") || "จัดการทักษะ"}
                                    </DialogTitle>
                                    <p className="text-xl font-bold text-slate-400">สร้าง แก้ไข หรือลบทักษะที่ใช้ในห้องเรียนสุดคูลของคุณ</p>
                                </div>
                            </div>
                            <Button 
                                variant="outline" 
                                className="rounded-3xl border-4 border-slate-200 font-extrabold py-10 px-12 text-2xl transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95 shadow-lg" 
                                onClick={() => onOpenChange(false)}
                            >
                                {t("done") || "เสร็จสิ้น"}
                            </Button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-16 custom-scrollbar-thick focus-visible:outline-none bg-slate-50/50">
                        <div className="max-w-[1800px] mx-auto space-y-24 pb-32">
                            
                            {/* Positive Skills Section */}
                            <section className="space-y-12">
                                <header className="flex items-center gap-8">
                                    <div className="w-4 h-16 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                                    <div className="flex-1">
                                        <h3 className="text-4xl font-black text-slate-800 tracking-tight">{t("positiveFeedback") || "คะแนนบวก"}</h3>
                                        <p className="text-xl font-bold text-slate-400 mt-1">{t("positiveFeedbackDesc") || "ทักษะที่ช่วยส่งเสริมพฤติกรรมเชิงบวกและสร้างสรรค์"}</p>
                                    </div>
                                    <div className="bg-emerald-500 text-white font-black px-8 py-3 rounded-[2rem] text-xl shadow-xl shadow-emerald-100">
                                        {positiveSkills.length} {t("skills") || "ทักษะ"}
                                    </div>
                                </header>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-10">
                                    <AnimatePresence mode="popLayout">
                                        {positiveSkills.map(renderSkillCard)}
                                    </AnimatePresence>
                                    
                                    {/* Add Card Block (Positive) */}
                                    <div className="col-span-full bg-white rounded-[4rem] border-4 border-dashed border-emerald-100 p-16 mt-8 shadow-inner bg-gradient-to-br from-white to-emerald-50/30">
                                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-center">
                                            <div className="xl:col-span-8">
                                                <div className="bg-slate-50 rounded-[3rem] p-8 border-2 border-slate-100 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50 transition-all">
                                                    <label className="text-sm font-black text-emerald-500 uppercase tracking-[0.2em] pl-6 mb-3 block">Quick Add Skill Name</label>
                                                    <Input 
                                                        placeholder="เช่น ตั้งใจเรียนมาก, ช่วยเพื่อน..." 
                                                        value={newSkill.type === "POSITIVE" ? newSkill.name : ""}
                                                        onChange={e => setNewSkill({ ...newSkill, name: e.target.value, type: "POSITIVE" })}
                                                        className="border-0 focus-visible:ring-0 text-4xl font-black bg-transparent h-20 px-6 placeholder:text-slate-200 italic"
                                                    />
                                                </div>
                                            </div>
                                            <div className="xl:col-span-2">
                                                <div className="bg-slate-50 rounded-[3rem] p-8 border-2 border-slate-100 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50 transition-all">
                                                    <label className="text-sm font-black text-emerald-500 uppercase tracking-[0.2em] text-center mb-3 block">Points</label>
                                                    <Input 
                                                        type="number"
                                                        placeholder="+1"
                                                        value={newSkill.type === "POSITIVE" ? newSkill.weight : ""}
                                                        onChange={e => setNewSkill({ ...newSkill, weight: e.target.value, type: "POSITIVE" })}
                                                        className="border-0 focus-visible:ring-0 text-5xl font-black bg-transparent h-20 text-center"
                                                    />
                                                </div>
                                            </div>
                                            <div className="xl:col-span-2">
                                                <Button 
                                                    className="w-full h-[140px] rounded-[4rem] bg-emerald-500 hover:bg-emerald-600 text-3xl font-black shadow-2xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center p-0 overflow-hidden"
                                                    onClick={() => handleAddSkill("POSITIVE")}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? <Loader2 className="w-12 h-12 animate-spin text-white" /> : <Plus className="w-16 h-16 text-white" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <Separator className="bg-slate-200/50 h-2 rounded-full" />

                            {/* Needs Work Section */}
                            <section className="space-y-12">
                                <header className="flex items-center gap-8">
                                    <div className="w-4 h-16 bg-rose-500 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.3)]" />
                                    <div className="flex-1">
                                        <h3 className="text-4xl font-black text-slate-800 tracking-tight">{t("needsWorkFeedback") || "ต้องปรับปรุง"}</h3>
                                        <p className="text-xl font-bold text-slate-400 mt-1">{t("needsWorkFeedbackDesc") || "พฤติกรรมที่ควรตักเตือนหรือปรับปรุงแก้ไข"}</p>
                                    </div>
                                    <div className="bg-rose-500 text-white font-black px-8 py-3 rounded-[2rem] text-xl shadow-xl shadow-rose-100">
                                        {needsWorkSkills.length} {t("skills") || "ทักษะ"}
                                    </div>
                                </header>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-10">
                                    <AnimatePresence mode="popLayout">
                                        {needsWorkSkills.map(renderSkillCard)}
                                    </AnimatePresence>

                                    {/* Add Card Block (Needs Work) */}
                                    <div className="col-span-full bg-white rounded-[4rem] border-4 border-dashed border-rose-100 p-16 mt-8 shadow-inner bg-gradient-to-br from-white to-rose-50/30">
                                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-center">
                                            <div className="xl:col-span-8">
                                                <div className="bg-slate-50 rounded-[3rem] p-8 border-2 border-slate-100 focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-50 transition-all">
                                                    <label className="text-sm font-black text-rose-500 uppercase tracking-[0.2em] pl-6 mb-3 block">Infraction Skill Name</label>
                                                    <Input 
                                                        placeholder="เช่น ไม่ส่งงาน, เล่นในห้อง..." 
                                                        value={newSkill.type === "NEEDS_WORK" ? newSkill.name : ""}
                                                        onChange={e => setNewSkill({ ...newSkill, name: e.target.value, type: "NEEDS_WORK" })}
                                                        className="border-0 focus-visible:ring-0 text-4xl font-black bg-transparent h-20 px-6 placeholder:text-slate-200 italic"
                                                    />
                                                </div>
                                            </div>
                                            <div className="xl:col-span-2">
                                                <div className="bg-slate-50 rounded-[3rem] p-8 border-2 border-slate-100 focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-50 transition-all">
                                                    <label className="text-sm font-black text-rose-500 uppercase tracking-[0.2em] text-center mb-3 block">Points</label>
                                                    <Input 
                                                        type="number"
                                                        placeholder="-1"
                                                        value={newSkill.type === "NEEDS_WORK" ? newSkill.weight : ""}
                                                        onChange={e => setNewSkill({ ...newSkill, weight: e.target.value, type: "NEEDS_WORK" })}
                                                        className="border-0 focus-visible:ring-0 text-5xl font-black bg-transparent h-20 text-center"
                                                    />
                                                </div>
                                            </div>
                                            <div className="xl:col-span-2">
                                                <Button 
                                                    className="w-full h-[140px] rounded-[4rem] bg-rose-500 hover:bg-rose-600 text-3xl font-black shadow-2xl shadow-rose-200 transition-all active:scale-95 flex items-center justify-center p-0 overflow-hidden"
                                                    onClick={() => handleAddSkill("NEEDS_WORK")}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? <Loader2 className="w-12 h-12 animate-spin text-white" /> : <Plus className="w-16 h-16 text-white" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </main>
                </DialogContent>
            </Dialog>

            {/* Deletion confirmation modal */}
            <Dialog open={!!skillToDelete} onOpenChange={(val) => !val && setSkillToDelete(null)}>
                <DialogContent className="max-w-[500px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-[4rem] z-[200] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="p-16 flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-rose-50 rounded-full flex items-center justify-center mb-8 border-8 border-rose-100 shadow-inner">
                            <Trash2 className="w-14 h-14 text-rose-500" />
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 tracking-tight mb-4">
                             ลบทักษะนี้?
                        </h3>
                        <p className="text-xl font-bold text-slate-400 leading-relaxed mb-12">
                             คุณแน่ใจหรือไม่ที่จะลบทักษะนี้ออกจากคลังข้อมูลของคุณ? การกระทำนี้ไม่สามารถย้อนกลับได้
                        </p>
                        <div className="flex gap-6 w-full">
                            <Button 
                                variant="outline" 
                                className="flex-1 py-10 rounded-[2rem] font-black border-4 text-slate-500 hover:bg-slate-50 transition-all text-2xl"
                                onClick={() => setSkillToDelete(null)}
                                disabled={isSubmitting}
                            >
                                ยกเลิก
                            </Button>
                            <Button 
                                className="flex-1 py-10 rounded-[2rem] font-black bg-rose-500 hover:bg-rose-600 shadow-2xl shadow-rose-200 transition-all active:scale-95 text-2xl text-white"
                                onClick={confirmDeleteSkill}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : "ยืนยันลบ"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
