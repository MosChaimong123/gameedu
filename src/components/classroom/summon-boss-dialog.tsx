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
import { Sword, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/components/providers/socket-provider";
import Image from "next/image";

const BOSS_PRESETS = [
    { id: "lethargy_dragon",    label: "มังกรเกียจคร้าน",    image: "/assets/monsters/lethargy_dragon.png" },
    { id: "inferno_drake",      label: "มังกรเพลิง",          image: "/assets/mobs/bosses/inferno_drake.png" },
    { id: "frost_king",         label: "ราชาน้ำแข็ง",         image: "/assets/mobs/bosses/frost_king.png" },
    { id: "shadow_queen",       label: "ราชินีเงามืด",        image: "/assets/mobs/bosses/shadow_queen.png" },
    { id: "void_watcher",       label: "ผู้เฝ้า Void",        image: "/assets/mobs/bosses/void_watcher.png" },
    { id: "necromancer_lord",   label: "ลอร์ดนรก",            image: "/assets/mobs/bosses/necromancer_lord.png" },
    { id: "celestial_guardian", label: "ผู้พิทักษ์สวรรค์",   image: "/assets/mobs/bosses/celestial_guardian.png" },
    { id: "ancient_treant",     label: "ต้นไม้โบราณ",         image: "/assets/mobs/bosses/ancient_treant.png" },
];

interface SummonBossDialogProps {
    classId: string;
    onBossSummoned: (boss: any) => void;
    onBossDismissed: () => void;
    currentBoss?: any;
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
    const [bossName, setBossName] = useState(currentBoss?.name || "มังกรแห่งความเกียจคร้าน");
    const [maxHp, setMaxHp] = useState(currentBoss?.maxHp || 1000);
    const [rewardGold, setRewardGold] = useState(currentBoss?.rewardGold || 500);
    const [selectedBoss, setSelectedBoss] = useState(BOSS_PRESETS[0]);
    const { toast } = useToast();

    const handleSummon = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/classrooms/${classId}/boss`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bossName,
                    maxHp,
                    rewardGold,
                    image: selectedBoss.image
                })
            });

            if (!res.ok) throw new Error("Summon failed");

            const data = await res.json();

            socket?.emit("classroom-update", {
                classId,
                type: "BOSS_SUMMONED",
                data: { boss: data.boss }
            });

            onBossSummoned(data.boss);
            setOpen(false);
            toast({
                title: "อัญเชิญสำเร็จ!",
                description: `${bossName} ปรากฏตัวในห้องเรียนแล้ว!`,
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
            <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-6 rounded-3xl shadow-2xl border-0 overflow-y-auto bg-[#F8FAFC]">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />

                <DialogHeader className="pt-4">
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        {currentBoss ? "ภารกิจกำจัดบอส" : "อัญเชิญบอสประจำห้องเรียน"}
                    </DialogTitle>
                    <DialogDescription>
                        {currentBoss
                            ? "บอสกำลังคุกคามห้องเรียน! งานของนักเรียนทุกคนจะกลายเป็นดาเมจ"
                            : "เลือกบอสและตั้งค่าพลังให้สอดคล้องกับจำนวนนักเรียนในห้อง"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center py-4 gap-5">
                    {/* Boss preview */}
                    <div className="relative w-36 h-36 group">
                        <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                        <Image
                            src={currentBoss?.image ?? selectedBoss.image}
                            alt="Boss"
                            width={144}
                            height={144}
                            className="relative z-10 drop-shadow-2xl animate-bounce object-contain"
                            style={{ animationDuration: '3s' }}
                        />
                    </div>

                    {!currentBoss ? (
                        <div className="w-full space-y-5">
                            {/* Boss picker */}
                            <div className="space-y-2">
                                <Label className="font-bold">เลือกรูปแบบบอส</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    {BOSS_PRESETS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={() => {
                                                setSelectedBoss(preset);
                                                setBossName(preset.label);
                                            }}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                                                selectedBoss.id === preset.id
                                                    ? "border-indigo-500 bg-indigo-50 shadow-md"
                                                    : "border-slate-200 bg-white hover:border-indigo-300"
                                            }`}
                                        >
                                            <Image
                                                src={preset.image}
                                                alt={preset.label}
                                                width={48}
                                                height={48}
                                                className="object-contain h-12 w-12"
                                            />
                                            <span className="text-[9px] font-bold text-center text-slate-600 leading-tight">
                                                {preset.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Boss name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="font-bold">ชื่อบอส</Label>
                                <Input
                                    id="name"
                                    value={bossName}
                                    onChange={(e) => setBossName(e.target.value)}
                                    className="font-medium"
                                />
                            </div>

                            {/* HP */}
                            <div className="space-y-2">
                                <Label htmlFor="hp" className="font-bold">พลังชีวิต (HP)</Label>
                                <Input
                                    id="hp"
                                    type="number"
                                    value={maxHp}
                                    onChange={(e) => setMaxHp(parseInt(e.target.value))}
                                    className="font-medium"
                                />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    แนะนำ: นักเรียน 30 คน → 3,000–5,000 HP
                                </p>
                            </div>

                            {/* Reward */}
                            <div className="space-y-2">
                                <Label htmlFor="reward" className="font-bold">รางวัล (Gold)</Label>
                                <Input
                                    id="reward"
                                    type="number"
                                    value={rewardGold}
                                    onChange={(e) => setRewardGold(parseInt(e.target.value))}
                                    className="font-medium text-amber-600 focus-visible:ring-amber-500"
                                />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    บันทึกเป็นคะแนนพฤติกรรม (Positive) และทอง
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-500">สถานะปัจจุบัน:</span>
                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase">ACTIVE</span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-black">
                                    <span className="text-slate-600">BOSS HP</span>
                                    <span className="text-indigo-600">{currentBoss.currentHp} / {currentBoss.maxHp}</span>
                                </div>
                                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-1000"
                                        style={{ width: `${(currentBoss.currentHp / currentBoss.maxHp) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
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
                        <Button
                            onClick={handleSummon}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto font-black"
                        >
                            <Sword className="w-4 h-4 mr-2" /> อัญเชิญทันที
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
