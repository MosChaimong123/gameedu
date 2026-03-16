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
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newSkill, setNewSkill] = useState({ name: "", weight: "", type: "POSITIVE", icon: "star" });

    const positiveSkills = skills.filter(s => s.type === "POSITIVE");
    const needsWorkSkills = skills.filter(s => s.type === "NEEDS_WORK");

    const handleDeleteSkill = async (skillId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t("deleteConfirm") || "Are you sure?")) return;
        
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/skills/${skillId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                onSkillsChanged?.();
            }
        } catch (error) {
            console.error("Failed to delete skill", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddSkill = async (type: "POSITIVE" | "NEEDS_WORK") => {
        if (!newSkill.name || !newSkill.weight || isNaN(Number(newSkill.weight))) {
            alert(t("error") || "Invalid input");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/skills`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSkill.name,
                    weight: Number(newSkill.weight) * (type === "NEEDS_WORK" ? -1 : 1),
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

    const renderSkillButton = (skill: Skill, isPositive: boolean) => {
        const Icon = (skill.icon && iconMap[skill.icon as keyof typeof iconMap]) || (isPositive ? iconMap["default"] : AlertCircle);
        return (
            <div key={skill.id} className="relative group">
                {isEditing && (
                    <button
                        onClick={(e) => handleDeleteSkill(skill.id, e)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm z-10 hover:bg-red-600 transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
                <Button
                    variant="outline"
                    className={cn(
                        "h-auto flex-col gap-2 p-4 transition-all w-full",
                        isPositive 
                            ? "hover:bg-green-50 hover:border-green-200 hover:text-green-700" 
                            : "hover:bg-red-50 hover:border-red-200 hover:text-red-700",
                        isEditing && "opacity-80 pointer-events-none"
                    )}
                    onClick={() => onSelectSkill(skill.id, skill.weight)}
                    disabled={loading || isEditing || isSubmitting}
                >
                    <div className={cn("p-3 rounded-full", isPositive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm text-center whitespace-normal leading-tight">
                        {skill.name}
                    </span>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {isPositive ? `+${skill.weight}` : skill.weight}
                    </span>
                </Button>
            </div>
        );
    };

    const renderAddForm = (type: "POSITIVE" | "NEEDS_WORK") => {
        if (!isEditing) return null;
        return (
            <div className="col-span-full md:col-span-2 flex flex-col gap-2 p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                <Input 
                    placeholder={t("skillNamePlaceholder") || "Skill name"} 
                    value={newSkill.name} 
                    onChange={e => setNewSkill({...newSkill, name: e.target.value})} 
                    className="h-8"
                />
                <div className="flex gap-2">
                    <Input 
                        placeholder={t("weightPlaceholder") || "Points"} 
                        type="number" 
                        value={newSkill.weight} 
                        onChange={e => setNewSkill({...newSkill, weight: e.target.value})} 
                        className="h-8 w-20"
                    />
                    <Button 
                        size="sm" 
                        className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700" 
                        onClick={() => handleAddSkill(type)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                        {t("addSkill")}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) setIsEditing(false); // Reset edit mode on close
            onOpenChange(val);
        }}>
            <DialogContent className="max-w-[800px] w-[95vw] p-0 overflow-hidden bg-slate-50 border-0 shadow-2xl rounded-3xl h-[90vh] flex flex-col">
                <DialogHeader className="relative">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-6 top-0 text-slate-500 hover:text-indigo-600"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? t("done") : t("editSkills")}
                    </Button>
                    <DialogTitle className="text-center text-xl mt-4">
                        {t("giveFeedbackTo")} <span className="text-indigo-600">{studentName}</span>
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="positive" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="positive">{t("positiveFeedback")}</TabsTrigger>
                        <TabsTrigger value="needs_work">{t("needsWorkFeedback")}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="positive" className="grid grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                        {positiveSkills.map((skill) => renderSkillButton(skill, true))}
                        {renderAddForm("POSITIVE")}
                        {!isEditing && positiveSkills.length === 0 && (
                            <div className="col-span-full text-center py-8 text-slate-400 italic">
                                {t("noSkillsConfigured")}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="needs_work" className="grid grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                        {needsWorkSkills.map((skill) => renderSkillButton(skill, false))}
                        {renderAddForm("NEEDS_WORK")}
                        {!isEditing && needsWorkSkills.length === 0 && (
                            <div className="col-span-full text-center py-8 text-slate-400 italic">
                                {t("noSkillsConfigured")}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
