"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sword, Trash2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";
import Image from "next/image";
import {
    BOSS_PRESETS,
    DIFFICULTIES,
    computeBossHp,
    computeRewardGold,
    DIFFICULTY_MATERIALS,
    XP_FROM_GOLD_RATIO,
    type BossPresetConfig,
    type DifficultyConfig,
} from "@/lib/game/boss-config";

interface SummonBossDialogProps {
    classId: string;
    onBossSummoned: (boss: unknown) => void;
    onBossDismissed: () => void;
    currentBoss?: Record<string, unknown>;
}

export function SummonBossDialog({
    classId,
    onBossSummoned,
    onBossDismissed,
    currentBoss
}: SummonBossDialogProps) {
    const { socket } = useSocket();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1 = boss, 2 = difficulty, 3 = rewards

    const [selectedBoss, setSelectedBoss] = useState<BossPresetConfig>(BOSS_PRESETS[0]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyConfig>(DIFFICULTIES[1]); // EASY default
    const [rewardGoldOverride, setRewardGoldOverride] = useState<string>("");

    const { toast } = useToast();

    const baseGold = computeRewardGold(selectedDifficulty.id, 1.0);
    const finalGold = rewardGoldOverride !== "" ? parseInt(rewardGoldOverride) || baseGold : baseGold;
    const finalXp = Math.round(finalGold * XP_FROM_GOLD_RATIO);
    const finalHp = computeBossHp(selectedBoss.id, selectedDifficulty.id);
    const materials = DIFFICULTY_MATERIALS[selectedDifficulty.id] ?? [];

    function handleOpen(v: boolean) {
        setOpen(v);
        if (v) {
            setStep(1);
            setSelectedBoss(BOSS_PRESETS[0]);
            setSelectedDifficulty(DIFFICULTIES[1]);
            setRewardGoldOverride("");
        }
    }

    const handleSummon = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/boss`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bossId: selectedBoss.id,
                    difficulty: selectedDifficulty.id,
                    rewardGold: rewardGoldOverride !== "" ? finalGold : undefined,
                })
            });

            if (!res.ok) throw new Error("Summon failed");

            const data = await res.json() as { boss: unknown };

            socket?.emit("classroom-update", {
                classId,
                type: "BOSS_SUMMONED",
                data: { boss: data.boss }
            });

            onBossSummoned(data.boss);
            setOpen(false);
            toast({
                title: "อัญเชิญสำเร็จ!",
                description: `${selectedBoss.name} ปรากฏตัวในห้องเรียนแล้ว!`,
                className: "bg-indigo-600 text-white"
            });
        } catch {
            toast({ title: "Error", description: "ไม่สามารถอัญเชิญบอสได้", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/boss`, {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Dismiss failed");

            socket?.emit("classroom-update", {
                classId,
                type: "BOSS_DEFEATED",
                data: { boss: null }
            });

            onBossDismissed();
            setOpen(false);
            toast({ title: "Dismissed", description: "บอสถูกส่งกลับไปแล้ว" });
        } catch {
            toast({ title: "Error", description: "ไม่สามารถยกเลิกบอสได้", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const stepLabels = ["เลือกบอส", "ระดับ", "รางวัล"];

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    className={`h-9 border-0 font-semibold shadow backdrop-blur-sm ${
                        currentBoss
                            ? "bg-rose-500/80 hover:bg-rose-600 text-white"
                            : "bg-indigo-500/80 hover:bg-indigo-600 text-white"
                    }`}
                >
                    <Sword className={`w-4 h-4 mr-1.5 ${currentBoss ? "animate-pulse" : ""}`} />
                    {currentBoss ? "จัดการบอส" : "อัญเชิญบอส"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-3xl shadow-2xl border-0 overflow-hidden bg-[#F8FAFC]">
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 z-10" />

                <div className="flex flex-col overflow-y-auto px-6 pb-6 pt-6">
                    <DialogHeader className="pt-2">
                        <DialogTitle className="text-2xl font-black flex items-center gap-2">
                            {currentBoss ? "ภารกิจกำจัดบอส" : "อัญเชิญบอสประจำห้องเรียน"}
                        </DialogTitle>
                        <DialogDescription>
                            {currentBoss
                                ? "บอสกำลังคุกคามห้องเรียน! งานของนักเรียนทุกคนจะกลายเป็นดาเมจ"
                                : "เลือกบอส ระดับความยาก และตั้งค่ารางวัล"}
                        </DialogDescription>
                    </DialogHeader>

                    {currentBoss ? (
                        /* ── Active boss management ── */
                        <div className="mt-4 space-y-4">
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative w-32 h-32">
                                    <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-2xl" />
                                    <Image
                                        src={(currentBoss.image as string) ?? "/assets/monsters/lethargy_dragon.png"}
                                        alt="Boss"
                                        width={128}
                                        height={128}
                                        className="relative z-10 drop-shadow-2xl animate-bounce object-contain"
                                        style={{ animationDuration: "3s" }}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-xl text-slate-800">{currentBoss.name as string}</p>
                                    <p className="text-sm text-slate-500">{currentBoss.element as string} {currentBoss.elementIcon as string}</p>
                                </div>
                            </div>
                            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500">สถานะ:</span>
                                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase">ACTIVE</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-slate-600">BOSS HP</span>
                                        <span className="text-indigo-600">
                                            {currentBoss.currentHp as number} / {currentBoss.maxHp as number}
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-1000"
                                            style={{ width: `${((currentBoss.currentHp as number) / (currentBoss.maxHp as number)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    <div className="bg-white rounded-xl p-2 text-center border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">รางวัลทอง</p>
                                        <p className="font-black text-amber-600">{currentBoss.rewardGold as number}</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-2 text-center border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">รางวัล XP</p>
                                        <p className="font-black text-blue-600">{currentBoss.rewardXp as number}</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-2 text-center border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">ระดับ</p>
                                        <p className="font-black text-purple-600">{currentBoss.difficulty as string}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Wizard ── */
                        <>
                            {/* Step indicator */}
                            <div className="flex items-center justify-center gap-2 mt-4 mb-5">
                                {stepLabels.map((label, i) => {
                                    const stepNum = i + 1;
                                    const isActive = step === stepNum;
                                    const isDone = step > stepNum;
                                    return (
                                        <div key={stepNum} className="flex items-center gap-1">
                                            <button
                                                onClick={() => { if (isDone) setStep(stepNum); }}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                                    isActive
                                                        ? "bg-indigo-600 text-white shadow"
                                                        : isDone
                                                            ? "bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200"
                                                            : "bg-slate-100 text-slate-400 cursor-default"
                                                }`}
                                            >
                                                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <span>{stepNum}</span>}
                                                {label}
                                            </button>
                                            {i < 2 && <div className={`w-6 h-0.5 rounded ${step > stepNum ? "bg-indigo-400" : "bg-slate-200"}`} />}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Step 1: Select Boss ── */}
                            {step === 1 && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {BOSS_PRESETS.map((boss) => (
                                            <button
                                                key={boss.id}
                                                onClick={() => setSelectedBoss(boss)}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-left ${
                                                    selectedBoss.id === boss.id
                                                        ? "border-indigo-500 bg-indigo-50 shadow-md"
                                                        : "border-slate-200 bg-white hover:border-indigo-300"
                                                }`}
                                            >
                                                <Image
                                                    src={boss.image}
                                                    alt={boss.name}
                                                    width={56}
                                                    height={56}
                                                    className="object-contain h-14 w-14"
                                                />
                                                <span className="text-[10px] font-black text-center text-slate-700 leading-tight">{boss.name}</span>
                                                <span className="text-[9px] text-slate-400">{boss.elementIcon} {boss.element}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Boss detail panel */}
                                    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                                        <div className="flex gap-3 items-start">
                                            <Image
                                                src={selectedBoss.image}
                                                alt={selectedBoss.name}
                                                width={64}
                                                height={64}
                                                className="object-contain w-16 h-16 shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <p className="font-black text-base text-slate-800">{selectedBoss.name}</p>
                                                <p className="text-xs text-slate-400 italic mb-1">&ldquo;{selectedBoss.lore}&rdquo;</p>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 ${selectedBoss.elementColor}`}>
                                                    {selectedBoss.elementIcon} {selectedBoss.element}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2.5">
                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Passive</p>
                                            <p className="text-xs text-slate-600">{selectedBoss.passiveDescription}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">สกิล (ตามช่วง HP)</p>
                                            {selectedBoss.skills.map((sk) => (
                                                <div key={sk.id} className="flex items-start gap-2 bg-slate-50 rounded-xl p-2">
                                                    <span className="text-base">{sk.icon}</span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-700">
                                                            {sk.name}
                                                            <span className="ml-1.5 font-normal text-rose-500">HP &le;{Math.round(sk.triggerHpPct * 100)}%</span>
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 leading-tight">{sk.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 2: Difficulty ── */}
                            {step === 2 && (
                                <div className="space-y-2">
                                    {DIFFICULTIES.map((diff) => {
                                        const hp = computeBossHp(selectedBoss.id, diff.id);
                                        const gold = computeRewardGold(diff.id, 1.0);
                                        const isSelected = selectedDifficulty.id === diff.id;
                                        return (
                                            <button
                                                key={diff.id}
                                                onClick={() => setSelectedDifficulty(diff)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                                    isSelected
                                                        ? `border-2 ${diff.borderColor} ${diff.color} shadow-md`
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}
                                            >
                                                <span className="text-2xl w-8 text-center">{diff.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2">
                                                        <p className={`font-black text-base ${isSelected ? diff.textColor : "text-slate-700"}`}>
                                                            {diff.label}
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{diff.labelEN}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{diff.description}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">แนะนำ {diff.suggestedStudents}</p>
                                                </div>
                                                <div className="text-right shrink-0 space-y-0.5">
                                                    <p className="text-xs font-black text-slate-700">{hp.toLocaleString()} HP</p>
                                                    <p className="text-xs text-amber-600 font-bold">🪙 {gold}</p>
                                                </div>
                                                {isSelected && <CheckCircle2 className={`w-5 h-5 shrink-0 ${diff.textColor}`} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── Step 3: Rewards + Review ── */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    {/* Gold override */}
                                    <div className="space-y-2">
                                        <Label htmlFor="reward-gold" className="font-bold">
                                            รางวัลทอง (Gold)
                                        </Label>
                                        <Input
                                            id="reward-gold"
                                            type="number"
                                            placeholder={`ค่าเริ่มต้น: ${baseGold}`}
                                            value={rewardGoldOverride}
                                            onChange={(e) => setRewardGoldOverride(e.target.value)}
                                            className="font-medium text-amber-600 focus-visible:ring-amber-500"
                                        />
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            เว้นว่างเพื่อใช้ค่าเริ่มต้นตามระดับความยาก ({baseGold} ทอง)
                                        </p>
                                    </div>

                                    {/* Summary card */}
                                    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">สรุปก่อนอัญเชิญ</p>
                                        <div className="flex gap-4 items-center">
                                            <Image
                                                src={selectedBoss.image}
                                                alt={selectedBoss.name}
                                                width={72}
                                                height={72}
                                                className="object-contain w-18 h-18 shrink-0"
                                            />
                                            <div>
                                                <p className="font-black text-lg text-slate-800">{selectedBoss.name}</p>
                                                <p className="text-xs text-slate-400">{selectedBoss.elementIcon} {selectedBoss.element}</p>
                                                <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${selectedDifficulty.color} ${selectedDifficulty.textColor}`}>
                                                    {selectedDifficulty.icon} {selectedDifficulty.label}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">HP</p>
                                                <p className="font-black text-slate-700">{finalHp.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                                                <p className="text-[10px] text-amber-500 uppercase font-bold">ทอง</p>
                                                <p className="font-black text-amber-700">{finalGold.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                                                <p className="text-[10px] text-blue-400 uppercase font-bold">XP</p>
                                                <p className="font-black text-blue-700">{finalXp.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-green-50 rounded-xl p-2.5 text-center">
                                                <p className="text-[10px] text-green-500 uppercase font-bold">วัสดุ</p>
                                                <p className="font-black text-green-700">{materials.length} ชนิด</p>
                                            </div>
                                        </div>

                                        {/* Materials list */}
                                        {materials.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">วัสดุที่จะได้รับ</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {materials.map((m, i) => (
                                                        <span key={i} className="text-[11px] bg-green-50 border border-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg">
                                                            {m.type} ×{m.quantity}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Passive */}
                                        <div className="bg-slate-50 rounded-xl p-2.5">
                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-0.5">Passive</p>
                                            <p className="text-xs text-slate-600">{selectedBoss.passiveDescription}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="px-6 pb-6 gap-2 sm:gap-0">
                    {currentBoss ? (
                        <Button
                            variant="destructive"
                            onClick={handleDismiss}
                            disabled={loading}
                            className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> ยกเลิกบอส
                        </Button>
                    ) : (
                        <div className="flex gap-2 w-full sm:w-auto">
                            {step > 1 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setStep((s) => s - 1)}
                                    disabled={loading}
                                    className="flex-1 sm:flex-initial"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
                                </Button>
                            )}
                            {step < 3 ? (
                                <Button
                                    onClick={() => setStep((s) => s + 1)}
                                    className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 font-black"
                                >
                                    ถัดไป <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSummon}
                                    disabled={loading}
                                    className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 font-black"
                                >
                                    <Sword className="w-4 h-4 mr-2" /> อัญเชิญทันที
                                </Button>
                            )}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
