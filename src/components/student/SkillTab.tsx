"use client"

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";

interface SkillTabProps {
    studentId: string;
    classId: string;
    mana: number;
    stamina: number;
    jobClass: string | null;
    jobTier?: string;
    advanceClass?: string | null;
    level?: number;
    jobSkills: string[];
    onUpdateStudent: (data: any) => void;
    onShowJobModal?: () => void;
}

import {
  buildGlobalSkillMap,
  getMergedClassDef,
  resolveEffectiveJobKey,
  type Skill,
} from "@/lib/game/job-system";

const CLASS_ICONS: Record<string, string> = {
    WARRIOR: "⚔️",
    MAGE: "🔮",
    RANGER: "🏹",
    HEALER: "✨",
    ROGUE: "🗡️",
    KNIGHT: "🛡️",
    BERSERKER: "🪓",
    ARCHMAGE: "🌟",
    WARLOCK: "💀",
    SNIPER: "🎯",
    BEASTMASTER: "🐉",
    SAINT: "😇",
    DRUID: "🌿",
    ASSASSIN: "🌑",
    DUELIST: "⚡",
    PALADIN: "🌟",
    GUARDIAN: "🛡️",
    WARLORD: "👑",
    "DEATH KNIGHT": "💀",
    "GRAND WIZARD": "🔮",
    ELEMENTALIST: "🌊",
    LICH: "💀",
    "SHADOW MAGE": "🌑",
    HAWKEYE: "👁️",
    DEADEYE: "🎯",
    "BEAST KING": "🦁",
    TAMER: "🐾",
    ARCHBISHOP: "✝️",
    "DIVINE HERALD": "😇",
    "ELDER DRUID": "🌳",
    "NATURE WARDEN": "🌿",
    "SHADOW LORD": "🌑",
    PHANTOM: "👻",
    "BLADE MASTER": "⚔️",
    "SWORD SAINT": "🗡️",
};

export function SkillTab({
    studentId,
    classId,
    mana,
    stamina,
    jobClass,
    jobTier = "BASE",
    advanceClass = null,
    level = 1,
    jobSkills,
    onUpdateStudent,
    onShowJobModal
}: SkillTabProps) {
    // Determine if advance/master promotion is available
    const canAdvance = jobClass && jobTier === "BASE" && level >= 20;
    const canMaster = jobClass && jobTier === "ADVANCE" && advanceClass && level >= 50;
    const { toast } = useToast();
    const { socket } = useSocket();
    const [usingId, setUsingId] = useState<string | null>(null);

    // Map jobSkills (IDs) to full Skill objects + Add Auto-unlocked skills by level
    const currentSkills: Skill[] = useMemo(() => {
        const eff = resolveEffectiveJobKey({
            jobClass,
            jobTier,
            advanceClass,
        });
        const classDef = getMergedClassDef(eff);
        const skillsMap = new Map<string, Skill>();
        const globalMap = buildGlobalSkillMap();

        if (jobSkills?.length) {
            jobSkills.forEach((id) => {
                const found = globalMap[id];
                if (found) skillsMap.set(id, found);
            });
        }

        classDef.skills.forEach((skill) => {
            if (skill.unlockLevel <= level) {
                skillsMap.set(skill.id, skill);
            }
        });

        return Array.from(skillsMap.values()).sort(
            (a, b) => a.unlockLevel - b.unlockLevel
        );
    }, [jobClass, jobTier, advanceClass, jobSkills, level]);

    const displayIconKey =
        jobTier !== "BASE" && advanceClass
            ? advanceClass
            : jobClass || "NOVICE";

    const handleUseSkill = async (skill: Skill) => {
        const isAP = skill.costType === "AP";
        const currentResource = isAP ? stamina : mana;
        const resourceName = isAP ? "ค่าพลัง (Stamina)" : "มานา (Mana)";

        if (currentResource < skill.cost) {
            toast({
                title: `${resourceName} ไม่พอ!`,
                description: isAP ? "รอฟื้นฟูพลังงานสักครู่นะครับ" : "รอสักพักเพื่อให้มานาฟื้นฟูนะครับ",
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

                // 1. Update Boss HP for everyone in the room
                if (data.boss) {
                    socket?.emit("classroom-update", {
                        classId,
                        type: "BOSS_HP_UPDATE",
                        currentHp: data.boss.currentHp
                    });
                }

                // 2. Update Local Student State
                onUpdateStudent({ 
                    mana: data.mana, 
                    stamina: data.stamina 
                });
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
            {/* Header / Resource Status */}
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
                <div className="text-right space-y-2">
                    <div>
                        <p className="text-[10px] uppercase font-black text-indigo-300 tracking-widest mb-1">Stamina</p>
                        <div className="flex items-end justify-end gap-1">
                            <span className="text-2xl font-black text-white">{stamina}</span>
                            <span className="text-xs font-bold text-indigo-300 mb-1">SP</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-indigo-300 tracking-widest mb-1">Mana</p>
                        <div className="flex items-end justify-end gap-1">
                            <span className="text-2xl font-black text-white">{mana}</span>
                            <span className="text-xs font-bold text-indigo-300 mb-1">MP</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advance / Master Class Promotion Banner */}
            {(canAdvance || canMaster) && onShowJobModal && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 border-2 border-yellow-500/40 p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-yellow-400 transition-all"
                    onClick={onShowJobModal}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500/30 rounded-2xl flex items-center justify-center text-2xl animate-pulse">
                            {canMaster ? "👑" : "⚡"}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-yellow-300">
                                {canMaster ? "🏆 พร้อมเลื่อนขั้น Master Class!" : "⚔️ พร้อมเลื่อนขั้น Advance Class!"}
                            </h3>
                            <p className="text-xs text-yellow-200/70">
                                {canMaster
                                    ? `Lv.${level} — คุณมีคุณสมบัติครบแล้ว! กดเพื่อเลือก Master Class`
                                    : `Lv.${level} — คุณมีคุณสมบัติครบแล้ว! กดเพื่อเลือก Advance Class`
                                }
                            </p>
                        </div>
                    </div>
                    <div className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black text-sm uppercase tracking-wider shrink-0 transition-colors">
                        เลื่อนขั้น
                    </div>
                </motion.div>
            )}

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentSkills.map((skill) => {
                    const isAP = skill.costType === "AP";
                    const canUse = (isAP ? stamina : mana) >= skill.cost;
                    const icon =
                        CLASS_ICONS[displayIconKey] ||
                        CLASS_ICONS[jobClass || "WARRIOR"] ||
                        "✨";

                    return (
                        <motion.div
                            key={skill.id}
                            whileHover={{ y: -5 }}
                            className="group"
                        >
                            <GlassCard className="h-full flex flex-col p-6 relative overflow-hidden">
                                {/* Decorative Icon Background */}
                                <div className="absolute -right-4 -top-4 text-8xl opacity-5 group-hover:scale-110 transition-transform duration-500">
                                    {icon}
                                </div>

                                <div className="relative z-10 space-y-4 flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="w-14 h-14 bg-white shadow-inner rounded-2xl flex items-center justify-center text-3xl group-hover:rotate-12 transition-transform overflow-hidden">
                                            {skill.icon ? (
                                                <img 
                                                    src={skill.icon} 
                                                    alt={skill.name} 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                icon
                                            )}
                                        </div>
                                        <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-tighter
                                             ${canUse ? (isAP ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600') : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                            {skill.cost} {isAP ? "Stamina" : "MP"}
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
                                    {usingId === skill.id ? "กำลังร่ายเวท..." : canUse ? "ร่ายทักษะ" : isAP ? "Stamina ไม่พอ" : "มานาไม่พอ"}
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
                    <h4 className="text-xs font-black text-amber-900 uppercase">Tip: การจัดการพลังงาน</h4>
                    <p className="text-[11px] text-amber-800/80 font-medium leading-relaxed">
                        สกิลบางสายใช้ Stamina และบางสายใช้ Mana จัดการทั้งสองทรัพยากรให้ดีเพื่อทำดาเมจและคุมจังหวะการสู้บอส
                    </p>
                </div>
            </div>
        </div>
    );
}
