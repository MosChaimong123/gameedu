"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skill } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Heart, Star, Zap, ThumbsUp, Brain, Trophy, AlertCircle } from "lucide-react";

interface PointMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentName: string;
    skills: Skill[];
    onSelectSkill: (skillId: string, weight: number) => void;
    loading?: boolean;
}

// Map icon strings to Lucide components
const iconMap: Record<string, any> = {
    "heart": Heart,
    "star": Star,
    "zap": Zap,
    "hand": ThumbsUp, // 'hand' mapped to ThumbsUp
    "brain": Brain,
    "trophy": Trophy,
    "muscle": Zap, // 'muscle' mapped to Zap
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
    loading
}: PointMenuProps) {
    const positiveSkills = skills.filter(s => s.type === "POSITIVE");
    const needsWorkSkills = skills.filter(s => s.type === "NEEDS_WORK");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">
                        Give feedback to <span className="text-indigo-600">{studentName}</span>
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="positive" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="positive">Positive</TabsTrigger>
                        <TabsTrigger value="needs_work">Needs Work</TabsTrigger>
                    </TabsList>

                    <TabsContent value="positive" className="grid grid-cols-3 md:grid-cols-4 gap-4">
                        {positiveSkills.map((skill) => {
                            const Icon = iconMap[skill.icon] || iconMap["default"];
                            return (
                                <Button
                                    key={skill.id}
                                    variant="outline"
                                    className="h-auto flex-col gap-2 p-4 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all"
                                    onClick={() => onSelectSkill(skill.id, skill.weight)}
                                    disabled={loading}
                                >
                                    <div className="bg-green-100 p-3 rounded-full text-green-600">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <span className="font-semibold text-sm text-center whitespace-normal leading-tight">
                                        {skill.name}
                                    </span>
                                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                        +{skill.weight}
                                    </span>
                                </Button>
                            );
                        })}
                    </TabsContent>

                    <TabsContent value="needs_work" className="grid grid-cols-3 md:grid-cols-4 gap-4">
                        {needsWorkSkills.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-slate-400 italic">
                                No skills configured.
                            </div>
                        ) : (
                            needsWorkSkills.map((skill) => {
                                const Icon = iconMap[skill.icon] || AlertCircle;
                                return (
                                    <Button
                                        key={skill.id}
                                        variant="outline"
                                        className="h-auto flex-col gap-2 p-4 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all"
                                        onClick={() => onSelectSkill(skill.id, skill.weight)}
                                        disabled={loading}
                                    >
                                        <div className="bg-red-100 p-3 rounded-full text-red-600">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="font-semibold text-sm text-center whitespace-normal leading-tight">
                                            {skill.name}
                                        </span>
                                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                            {skill.weight}
                                        </span>
                                    </Button>
                                );
                            })
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
