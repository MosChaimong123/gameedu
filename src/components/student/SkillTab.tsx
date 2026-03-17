"use client"

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { SKILLS } from "@/lib/game/game-constants";

interface SkillTabProps {
    studentId: string;
    classId: string;
    mana: number;
    onUpdateStudent: (data: any) => void;
}

export function SkillTab({ studentId, classId, mana, onUpdateStudent }: SkillTabProps) {
    const { toast } = useToast();
    const [usingId, setUsingId] = useState<string | null>(null);

    const handleUseSkill = async (skill: any) => {
        if (mana < skill.manaCost) {
            toast({
                title: "มานาไม่พอ!",
                description: "รอสักพักเพื่อให้มานาฟื้นฟูนะครับ",
                variant: "destructive",
            });
            return;
        }

        setUsingId(skill.id);
        try {
            const res = await fetch("/api/student/skill", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skillId: skill.id, studentId, classId }),
            });

            const data = await res.json();

            if (data.success) {
                toast({
                    title: `ใช้ทักษะ ${skill.name} สำเร็จ! ✨`,
                    description: data.message,
                });
                onUpdateStudent({ mana: data.mana });
            } else {
                throw new Error(data.error || "เกิดข้อผิดพลาด");
            }
        } catch (err: any) {
            toast({
                title: "เกิดข้อผิดพลาด",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setUsingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Mana Status */}
            <div className="flex items-center justify-between bg-indigo-900/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/30 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-indigo-300" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white">ทักษะประจำตัว (Skills)</h2>
                        <p className="text-xs text-indigo-200">กดใช้ความสามารถพิเศษเพื่อชิงความได้เปรียบ</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-indigo-300 tracking-widest mb-1">มานาปัจจุบัน</p>
                    <div className="flex items-end gap-1">
                        <span className="text-3xl font-black text-white">{mana}</span>
                        <span className="text-xs font-bold text-indigo-300 mb-1">MP</span>
                    </div>
                </div>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SKILLS.map((skill) => {
                    const canUse = mana >= skill.manaCost;
                    
                    return (
                        <motion.div
                            key={skill.id}
                            whileHover={{ y: -5 }}
                            className="group"
                        >
                            <GlassCard className="h-full flex flex-col p-6 relative overflow-hidden">
                                 {/* Decorative Icon Background */}
                                 <div className="absolute -right-4 -top-4 text-8xl opacity-5 group-hover:scale-110 transition-transform duration-500">
                                     {skill.icon}
                                 </div>
                                 
                                 <div className="relative z-10 space-y-4 flex-1">
                                     <div className="flex justify-between items-start">
                                         <div className="w-14 h-14 bg-white shadow-inner rounded-2xl flex items-center justify-center text-3xl group-hover:rotate-12 transition-transform">
                                             {skill.icon}
                                         </div>
                                         <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-tighter
                                             ${canUse ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                             {skill.manaCost} MP
                                         </div>
                                     </div>

                                     <div>
                                         <h3 className="text-lg font-black text-slate-800">{skill.name}</h3>
                                         <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                                             {skill.description}
                                         </p>
                                     </div>
                                 </div>

                                 <Button
                                     onClick={() => handleUseSkill(skill)}
                                     disabled={usingId !== null || !canUse}
                                     className={`mt-6 w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs transition-all
                                         ${canUse 
                                             ? 'bg-indigo-600 hover:bg-black text-white shadow-lg' 
                                             : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                         }`}
                                 >
                                     {usingId === skill.id ? "กำลังร่ายเวท..." : (canUse ? "ร่ายทักษะ" : "มานาไม่พอ")}
                                 </Button>
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Tip Section */}
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase">Tip: การฟื้นฟูมานา</h4>
                    <p className="text-[11px] text-amber-800/80 font-medium leading-relaxed">
                        คุณจะได้รับมานา 20 หน่วยในทุกเช้าเมื่อเข้าสู่ระบบครั้งแรกของวัน! บริหารจัดการ MP ให้ดีในการล้มบอส
                    </p>
                </div>
            </div>
        </div>
    );
}
