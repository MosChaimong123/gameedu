"use client";

import { useState, useMemo } from "react";
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
import {
    getBossRaidTemplate,
    type BossRaidTemplate,
} from "@/lib/game/personal-classroom-boss";

interface SummonBossDialogProps {
    classId: string;
    gamifiedSettings: Record<string, unknown>;
    onRaidTemplateChange: (template: BossRaidTemplate | null) => void;
}

export function SummonBossDialog({
    classId,
    gamifiedSettings,
    onRaidTemplateChange,
}: SummonBossDialogProps) {
    const { socket } = useSocket();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1 = boss, 2 = difficulty, 3 = rewards
    const [showWizard, setShowWizard] = useState(false);

    const [selectedBoss, setSelectedBoss] = useState<BossPresetConfig>(BOSS_PRESETS[0]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyConfig>(DIFFICULTIES[1]); // EASY default
    const [rewardGoldOverride, setRewardGoldOverride] = useState<string>("");

    const { toast } = useToast();

    const raidTemplate = useMemo(
        () => getBossRaidTemplate(gamifiedSettings),
        [gamifiedSettings]
    );
    const hasRaid = !!raidTemplate;

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
            setShowWizard(!getBossRaidTemplate(gamifiedSettings));
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

            if (!res.ok) {
                const err = await res.json().catch(() => ({})) as { error?: string };
                throw new Error(err.error || "Summon failed");
            }

            const data = await res.json() as { bossRaidTemplate?: BossRaidTemplate; template?: BossRaidTemplate };

            const tpl = data.bossRaidTemplate ?? data.template ?? null;
            socket?.emit("classroom-update", {
                classId,
                type: "BOSS_SUMMONED",
                data: { bossRaidTemplate: tpl, template: tpl },
            });

            onRaidTemplateChange(tpl);
            setOpen(false);
            setShowWizard(false);
            toast({
                title: "อัญเชิญสำเร็จ!",
                description: `${selectedBoss.name} ปรากฏตัวในห้องเรียนแล้ว!`,
                className: "bg-indigo-600 text-white"
            });
        } catch (e) {
            toast({
                title: "Error",
                description: e instanceof Error ? e.message : "ไม่สามารถอัญเชิญบอสได้",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDismissAll = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/boss`, {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Dismiss failed");

            await res.json().catch(() => ({}));

            socket?.emit("classroom-update", {
                classId,
                type: "BOSS_DEFEATED",
                data: {},
            });

            onRaidTemplateChange(null);
            setOpen(false);
            toast({ title: "Dismissed", description: "ยกเลิกบอสทั้งหมดแล้ว" });
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
                        hasRaid
                            ? "bg-rose-500/80 hover:bg-rose-600 text-white"
                            : "bg-indigo-500/80 hover:bg-indigo-600 text-white"
                    }`}
                >
                    <Sword className={`w-4 h-4 mr-1.5 ${hasRaid ? "animate-pulse" : ""}`} />
                    {hasRaid ? "จัดการบอส" : "อัญเชิญบอส"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-3xl shadow-2xl border-0 overflow-hidden bg-[#F8FAFC]">
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 z-10" />

                <div className="flex flex-col overflow-y-auto px-6 pb-6 pt-6">
                    <DialogHeader className="pt-2">
                        <DialogTitle className="text-2xl font-black flex items-center gap-2">
                            {hasRaid && !showWizard ? "ภารกิจกำจัดบอส" : "อัญเชิญบอสประจำห้องเรียน"}
                        </DialogTitle>
                        <DialogDescription>
                            {hasRaid && !showWizard
                                ? "เทมเพลตบอสประจำห้อง — แต่ละนักเรียนมี HP / ความคืบหน้าเป็นของตัวเอง"
                                : "เลือกบอส ระดับความยาก และตั้งค่ารางวัล"}
                        </DialogDescription>
                    </DialogHeader>

                    {hasRaid && !showWizard ? (
                        <div className="mt-4 space-y-3">
                            <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <div className="relative w-16 h-16 shrink-0">
                                    <Image
                                        src={(raidTemplate?.image as string) ?? "/assets/monsters/lethargy_dragon.png"}
                                        alt=""
                                        width={64}
                                        height={64}
                                        className="object-contain"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-800 truncate">{raidTemplate?.name ?? "—"}</p>
                                        <p className="text-[10px] text-slate-500">
                                        {(raidTemplate?.maxHp ?? 0).toLocaleString()} HP ต่อคน · {raidTemplate?.difficulty ?? ""}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        รางวัล 🪙 {raidTemplate?.rewardGold ?? 0} · ✨ {raidTemplate?.rewardXp ?? 0} XP
                                    </p>
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

                <DialogFooter className="px-6 pb-6 gap-2 sm:gap-0 flex-col sm:flex-row sm:justify-end">
                    {hasRaid && !showWizard ? (
                        <div className="flex flex-wrap gap-2 w-full justify-end">
                            <Button
                                variant="destructive"
                                onClick={() => void handleDismissAll()}
                                disabled={loading}
                                className="bg-rose-600 hover:bg-rose-700"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> ยกเลิกทั้งหมด
                            </Button>
                            <Button
                                onClick={() => setShowWizard(true)}
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 font-black"
                            >
                                <Sword className="w-4 h-4 mr-2" /> เปลี่ยนบอส
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                            {hasRaid && showWizard && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowWizard(false)}
                                    disabled={loading}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> กลับรายการ
                                </Button>
                            )}
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
                                    onClick={() => void handleSummon()}
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
