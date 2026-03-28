"use client"

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CircleHelp, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { IdleEngine } from "@/lib/game/idle-engine";

interface SkillTabProps {
    studentId: string;
    jobClass: string | null;
    jobTier?: string;
    advanceClass?: string | null;
    level?: number;
    jobSkills: string[];
    onShowJobModal?: () => void;
    onNavigateToFarming?: () => void;
}

import {
  buildGlobalSkillMap,
  getMergedClassDef,
  resolveEffectiveJobKey,
  type Skill,
} from "@/lib/game/job-system";
import { calculateGrantedSkillPoints, getEffectiveSkillAtRank } from "@/lib/game/skill-tree";

type SkillTreeNode = {
  skillId: string;
  currentRank: number;
  maxRank: number;
  requiredLevel: number;
  canUpgrade: boolean;
  lockReason: string | null;
  lockMessage: string | null;
};

const CLASS_ICONS: Record<string, string> = {
    WARRIOR: "⚔️", MAGE: "🔮", RANGER: "🏹", HEALER: "✨", ROGUE: "🗡️",
    KNIGHT: "🛡️", BERSERKER: "🪓", ARCHMAGE: "🌟", WARLOCK: "💀",
    SNIPER: "🎯", BEASTMASTER: "🐉", SAINT: "😇", DRUID: "🌿",
    ASSASSIN: "🌑", DUELIST: "⚡",
    PALADIN: "⚖️", GUARDIAN: "🏰", WARLORD: "🚩", "DEATH KNIGHT": "🌒",
    "GRAND WIZARD": "🌌", ELEMENTALIST: "🌪️", LICH: "☠️", "SHADOW MAGE": "🌘",
    HAWKEYE: "👁️", DEADEYE: "💥", "BEAST KING": "🦁", TAMER: "🐾",
    ARCHBISHOP: "🕌", "DIVINE HERALD": "🎺", "ELDER DRUID": "🌳", "NATURE WARDEN": "🦌",
    "SHADOW LORD": "👑", PHANTOM: "👻", "BLADE MASTER": "🌀", "SWORD SAINT": "⚔️",
};

type ClassTierKey = "BASE" | "ADVANCE" | "MASTER";

function resolveSkillTierByUnlockLevel(unlockLevel: number): ClassTierKey {
    if (unlockLevel >= 50) return "MASTER";
    if (unlockLevel >= 20) return "ADVANCE";
    return "BASE";
}

function getEmblemPath(className: string, currentTier: string): string {
  const normalized = (className || "NOVICE").toLowerCase().replace(/\s+/g, "_");
  const prefix = currentTier === "BASE" ? "base" : (currentTier === "ADVANCE" ? "adv" : "master");
  return `/assets/jobs/emblems/${prefix}_${normalized}.png`;
}

const TIER_META: Record<ClassTierKey, { title: string; subtitle: string; badgeClass: string }> = {
    BASE: {
        title: "Base Class Skills",
        subtitle: "สกิลพื้นฐานสำหรับการต่อสู้ช่วงต้น",
        badgeClass: "bg-slate-100 text-slate-700",
    },
    ADVANCE: {
        title: "Advance Class Skills",
        subtitle: "สกิลสายอาชีพขั้นกลาง (ปลดล็อกเมื่อถึงเงื่อนไขคลาส)",
        badgeClass: "bg-amber-100 text-amber-700",
    },
    MASTER: {
        title: "Master Class Skills",
        subtitle: "สกิลขั้นสูงสุดของสายอาชีพ",
        badgeClass: "bg-violet-100 text-violet-700",
    },
};

export function SkillTab({
    studentId,
    jobClass,
    jobTier = "BASE",
    advanceClass = null,
    level = 1,
    jobSkills,
    onShowJobModal,
    onNavigateToFarming
}: SkillTabProps) {
    const maxLevel = IdleEngine.getMaxLevel();
    const displayLevel = Math.min(level, maxLevel);
    const isMaxLevel = displayLevel >= maxLevel;
    // Determine if advance/master promotion is available
    const canAdvance = jobClass && jobTier === "BASE" && level >= 20;
    const canMaster = jobClass && jobTier === "ADVANCE" && advanceClass && level >= 50;
    const { toast } = useToast();
    const [treeLoading, setTreeLoading] = useState(false);
    const [upgradeLoadingId, setUpgradeLoadingId] = useState<string | null>(null);
    const [respecLoading, setRespecLoading] = useState(false);
    const [skillPointsAvailable, setSkillPointsAvailable] = useState(0);
    const [skillTree, setSkillTree] = useState<Record<string, SkillTreeNode>>({});
    const [respecCost, setRespecCost] = useState(0);
    const [totalEarnedPoints, setTotalEarnedPoints] = useState(calculateGrantedSkillPoints(displayLevel));
    const [spendableInCurrentTree, setSpendableInCurrentTree] = useState(0);
    const [bankedPoints, setBankedPoints] = useState(0);
    const treeStats = useMemo(() => {
        const nodes = Object.values(skillTree);
        const spent = nodes.reduce((sum, node) => sum + Math.max(0, node.currentRank ?? 0), 0);
        const capacity = nodes.reduce((sum, node) => sum + Math.max(0, node.maxRank ?? 0), 0);
        const percent = capacity > 0 ? Math.min(100, Math.max(0, (spent / capacity) * 100)) : 0;
        return { spent, capacity, percent };
    }, [skillTree]);

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
    const upcomingSkills = useMemo(() => {
        const eff = resolveEffectiveJobKey({ jobClass, jobTier, advanceClass });
        const classDef = getMergedClassDef(eff);
        return classDef.skills
            .filter((skill) => (skill.unlockLevel ?? 1) > level)
            .sort((a, b) => a.unlockLevel - b.unlockLevel)
            .slice(0, 4);
    }, [jobClass, jobTier, advanceClass, level]);
    const groupedSkills = useMemo(() => {
        const base: Skill[] = [];
        const advance: Skill[] = [];
        const master: Skill[] = [];
        currentSkills.forEach((skill) => {
            const tier = resolveSkillTierByUnlockLevel(skill.unlockLevel ?? 1);
            if (tier === "MASTER") master.push(skill);
            else if (tier === "ADVANCE") advance.push(skill);
            else base.push(skill);
        });
        return { BASE: base, ADVANCE: advance, MASTER: master };
    }, [currentSkills]);

    useEffect(() => {
        const loadTree = async () => {
            setTreeLoading(true);
            try {
                const res = await fetch(`/api/student/skill/tree?studentId=${studentId}`);
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || "โหลด skill tree ไม่สำเร็จ");
                const map: Record<string, SkillTreeNode> = {};
                (data.skillTree as SkillTreeNode[]).forEach((node) => {
                    map[node.skillId] = node;
                });
                setSkillTree(map);
                setSkillPointsAvailable(data.skillPointsAvailable ?? 0);
                setRespecCost(data.respecCost ?? 0);
                setTotalEarnedPoints(data.totalEarnedPoints ?? calculateGrantedSkillPoints(data.level ?? level ?? 1));
                setSpendableInCurrentTree(data.spendableInCurrentTree ?? 0);
                setBankedPoints(data.bankedPoints ?? 0);
            } catch (err: any) {
                toast({ title: "โหลดสกิลไม่สำเร็จ", description: err.message, variant: "destructive" });
            } finally {
                setTreeLoading(false);
            }
        };
        void loadTree();
    }, [studentId, toast]);

    const displayIconKey =
        jobTier !== "BASE" && advanceClass
            ? advanceClass
            : jobClass || "NOVICE";

    const handleUpgradeSkill = async (skillId: string) => {
        setUpgradeLoadingId(skillId);
        try {
            const res = await fetch("/api/student/skill/upgrade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, skillId }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "อัปสกิลไม่สำเร็จ");
            setSkillPointsAvailable(data.skillPointsAvailable ?? 0);
            setSkillTree((prev) => ({
                ...prev,
                [skillId]: {
                    ...(prev[skillId] || {
                        skillId,
                        currentRank: 0,
                        maxRank: 3,
                        requiredLevel: 1,
                        canUpgrade: true,
                        lockReason: null,
                        lockMessage: null,
                    }),
                    currentRank: data.rank ?? (prev[skillId]?.currentRank ?? 0) + 1,
                },
            }));
            toast({ title: "อัปสกิลสำเร็จ", description: "เพิ่ม Rank แล้ว" });
            // Refresh full tree so lock states and points stay authoritative
            const treeRes = await fetch(`/api/student/skill/tree?studentId=${studentId}`);
            const treeData = await treeRes.json();
            if (treeRes.ok && treeData.success) {
                const map: Record<string, SkillTreeNode> = {};
                (treeData.skillTree as SkillTreeNode[]).forEach((node) => {
                    map[node.skillId] = node;
                });
                setSkillTree(map);
                setSkillPointsAvailable(treeData.skillPointsAvailable ?? 0);
                setRespecCost(treeData.respecCost ?? 0);
                setTotalEarnedPoints(treeData.totalEarnedPoints ?? calculateGrantedSkillPoints(treeData.level ?? level ?? 1));
                setSpendableInCurrentTree(treeData.spendableInCurrentTree ?? 0);
                setBankedPoints(treeData.bankedPoints ?? 0);
            }
        } catch (err: any) {
            toast({ title: "อัปสกิลไม่สำเร็จ", description: err.message, variant: "destructive" });
        } finally {
            setUpgradeLoadingId(null);
        }
    };

    const handleRespec = async () => {
        if (!confirm(`ยืนยันรีสกิล? จะใช้ Gold ${respecCost.toLocaleString()}`)) return;
        setRespecLoading(true);
        try {
            const res = await fetch("/api/student/skill/respec", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "รีสกิลไม่สำเร็จ");
            toast({ title: "รีสกิลสำเร็จ", description: `ใช้ Gold ${data.respecCost?.toLocaleString() ?? 0}` });
            const treeRes = await fetch(`/api/student/skill/tree?studentId=${studentId}`);
            const treeData = await treeRes.json();
            if (treeRes.ok && treeData.success) {
                const map: Record<string, SkillTreeNode> = {};
                (treeData.skillTree as SkillTreeNode[]).forEach((node) => {
                    map[node.skillId] = node;
                });
                setSkillTree(map);
                setSkillPointsAvailable(treeData.skillPointsAvailable ?? 0);
                setRespecCost(treeData.respecCost ?? 0);
                setTotalEarnedPoints(treeData.totalEarnedPoints ?? calculateGrantedSkillPoints(treeData.level ?? level ?? 1));
                setSpendableInCurrentTree(treeData.spendableInCurrentTree ?? 0);
                setBankedPoints(treeData.bankedPoints ?? 0);
            }
        } catch (err: any) {
            toast({ title: "รีสกิลไม่สำเร็จ", description: err.message, variant: "destructive" });
        } finally {
            setRespecLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Summary */}
            <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-indigo-50/40 to-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                            <Sparkles className="w-7 h-7 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-black text-slate-800">ทักษะประจำตัว (Skills)</h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">อัป Rank เพื่อเพิ่มพลังสกิล และปลดล็อกสกิลใหม่ตามเลเวล</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-black">
                                    แต้มคงเหลือ {skillPointsAvailable}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                                    สะสมทั้งหมด {totalEarnedPoints}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                                    ใช้ได้อีก {spendableInCurrentTree}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Skill Points</p>
                            <p className="text-3xl leading-none font-black text-indigo-700">{skillPointsAvailable}</p>
                        </div>
                        {bankedPoints > 0 && (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                <p className="text-[11px] font-semibold text-amber-700">แต้มสะสมรอใช้งาน {bankedPoints}</p>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label="คำอธิบายแต้มสะสมรอใช้งาน"
                                                className="text-amber-600 hover:text-amber-700 transition-colors"
                                            >
                                                <CircleHelp className="w-3.5 h-3.5" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[280px] text-xs leading-relaxed">
                                            แต้มส่วนนี้ยังไม่หายและจะใช้งานได้ทันทีเมื่อปลดล็อกสกิลใหม่/เลื่อนคลาส
                                            ตอนนี้ต้นไม้สกิลปัจจุบันเต็มแล้วจึงยังอัปต่อไม่ได้
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        )}
                        <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                                <span>ความจุต้นไม้สกิล</span>
                                <span>{treeStats.spent}/{treeStats.capacity}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                    style={{ width: `${treeStats.percent}%` }}
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleRespec}
                            disabled={respecLoading || treeLoading}
                            className="h-10 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black"
                        >
                            {respecLoading ? "กำลังรีสกิล..." : `Respec (${respecCost.toLocaleString()} Gold)`}
                        </Button>
                    </div>
                </div>
            </div>

            {upcomingSkills.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            สกิลที่กำลังจะปลดล็อก
                        </p>
                        {onNavigateToFarming && (
                            <Button
                                type="button"
                                onClick={onNavigateToFarming}
                                className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-3"
                            >
                                ไปฟาร์มเก็บ XP
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {upcomingSkills.map((skill) => (
                            <div key={skill.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-700 truncate">{skill.name}</p>
                                    <p className="text-[11px] text-slate-500">ปลดล็อกเมื่อถึงเลเวลที่กำหนด</p>
                                </div>
                                <span className="ml-3 shrink-0 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                    Lv.{Math.min(skill.unlockLevel, maxLevel)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                                    ? `${isMaxLevel ? `MAX LV ${maxLevel}` : `Lv.${displayLevel}`} — คุณมีคุณสมบัติครบแล้ว! กดเพื่อเลือก Master Class`
                                    : `${isMaxLevel ? `MAX LV ${maxLevel}` : `Lv.${displayLevel}`} — คุณมีคุณสมบัติครบแล้ว! กดเพื่อเลือก Advance Class`
                                }
                            </p>
                        </div>
                    </div>
                    <div className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black text-sm uppercase tracking-wider shrink-0 transition-colors">
                        เลื่อนขั้น
                    </div>
                </motion.div>
            )}

            {/* Skills Grid by Class Tier */}
            <div className="space-y-6">
                {(Object.keys(TIER_META) as ClassTierKey[]).map((tierKey) => {
                    const tierSkills = groupedSkills[tierKey];
                    if (!tierSkills.length) return null;
                    const meta = TIER_META[tierKey];
                    return (
                        <section key={tierKey} className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800">{meta.title}</h3>
                                    <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
                                </div>
                                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black", meta.badgeClass)}>
                                    {tierKey}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {tierSkills.map((skill) => {
                                    const node = skillTree[skill.id];
                                    const rank = node?.currentRank ?? 0;
                                    const rankedSkill = getEffectiveSkillAtRank(skill, rank);
                                    const canUpgrade = Boolean(node?.canUpgrade);
                                    const icon = CLASS_ICONS[displayIconKey] || CLASS_ICONS[jobClass || "WARRIOR"] || "✨";
                                    const emblemPath = getEmblemPath(displayIconKey, jobTier);

                                    return (
                                        <motion.div
                                            key={skill.id}
                                            whileHover={{ y: -5 }}
                                            className="group"
                                        >
                                            <GlassCard 
                                                className={cn(
                                                    "h-full flex flex-col p-6 relative overflow-hidden transition-all duration-500",
                                                    tierKey === "MASTER" ? "hover:border-amber-400/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]" :
                                                    tierKey === "ADVANCE" ? "hover:border-purple-400/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]" :
                                                    "hover:border-blue-400/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]"
                                                )}
                                            >
                                                {/* Tier Gradient Border (Bottom) */}
                                                <div className={cn(
                                                    "absolute bottom-0 left-0 right-0 h-1 transition-opacity opacity-30 group-hover:opacity-100",
                                                    tierKey === "MASTER" ? "bg-amber-500" :
                                                    tierKey === "ADVANCE" ? "bg-purple-500" :
                                                    "bg-blue-500"
                                                )} />

                                                {/* Decorative Icon Background / Watermark */}
                                                <div className="absolute -right-6 -top-6 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.07] group-hover:scale-110 transition-all duration-700 pointer-events-none grayscale">
                                                    <img src={emblemPath} alt="" className="w-full h-full object-contain" />
                                                </div>

                                                <div className="relative z-10 space-y-4 flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div className="w-14 h-14 bg-white shadow-inner rounded-2xl flex items-center justify-center text-3xl group-hover:scale-105 transition-transform overflow-hidden relative border border-slate-100">
                                                            {skill.icon ? (
                                                                <img 
                                                                    src={skill.icon} 
                                                                    alt={skill.name} 
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="group-hover:rotate-12 transition-transform">{icon}</span>
                                                            )}
                                                        </div>
                                                        <div className={cn(
                                                            "px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-tighter shadow-sm",
                                                            tierKey === "MASTER" ? "bg-amber-50 border-amber-100 text-amber-600" :
                                                            tierKey === "ADVANCE" ? "bg-purple-50 border-purple-100 text-purple-600" :
                                                            "bg-blue-50 border-blue-100 text-blue-600"
                                                        )}>
                                                            {rankedSkill.cost} {skill.costType === "AP" ? "Stamina" : "MP"}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h3 className="text-lg font-black text-slate-800">{skill.name}</h3>
                                                        <p className="text-[11px] font-bold text-indigo-500 mt-1">
                                                            Rank {rank}/{node?.maxRank ?? 6}
                                                        </p>
                                                        <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                                                            {skill.description}
                                                        </p>
                                                        {(typeof skill.damageMultiplier === "number" || typeof skill.healMultiplier === "number") && (
                                                            <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                                                                {typeof skill.damageMultiplier === "number" && (
                                                                    <span>
                                                                        DMG x{rankedSkill.damageMultiplier?.toFixed(2)}
                                                                        {rank > 0 ? ` (ฐาน x${skill.damageMultiplier.toFixed(2)})` : ""}
                                                                    </span>
                                                                )}
                                                                {typeof skill.damageMultiplier === "number" && typeof skill.healMultiplier === "number" ? " • " : ""}
                                                                {typeof skill.healMultiplier === "number" && (
                                                                    <span>
                                                                        HEAL x{rankedSkill.healMultiplier?.toFixed(2)}
                                                                        {rank > 0 ? ` (ฐาน x${skill.healMultiplier.toFixed(2)})` : ""}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        )}
                                                        {node?.lockMessage && !node.canUpgrade && (
                                                            <p className="text-[11px] mt-2 font-semibold text-rose-500">
                                                                ล็อก: {node.lockMessage}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={() => handleUpgradeSkill(skill.id)}
                                                    disabled={upgradeLoadingId !== null || !canUpgrade}
                                                    className={cn(
                                                        "mt-5 w-full h-11 rounded-xl font-black uppercase tracking-wider text-[11px] transition-all",
                                                        canUpgrade ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    {upgradeLoadingId === skill.id ? "กำลังอัป..." : canUpgrade ? "อัป Rank +1" : "อัปไม่ได้"}
                                                </Button>
                                            </GlassCard>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Tip Section */}
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase">Tip: อัปสกิลให้คุ้มแต้ม</h4>
                    <p className="text-[11px] text-amber-800/80 font-medium leading-relaxed">
                        เริ่มจากสกิลที่ใช้บ่อยก่อน และดูค่า DMG/HEAL ใต้การ์ดเพื่อเทียบความคุ้มค่าของแต่ละ Rank
                    </p>
                </div>
            </div>
        </div>
    );
}
