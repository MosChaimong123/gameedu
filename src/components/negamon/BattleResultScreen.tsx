"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, RotateCcw, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

export interface BattleStats {
    damageDealt: number;
    damageReceived: number;
    healsUsed: number;
    critCount: number;
    turnCount: number;
}

interface BattleResultScreenProps {
    isWinner: boolean;
    goldReward: number;
    stats: BattleStats;
    playerName: string;
    playerFormIcon: string;
    opponentName: string;
    opponentFormIcon: string;
    onRematch: () => void;
}

function CountUp({ to, suffix = "", duration = 900 }: { to: number; suffix?: string; duration?: number }) {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const start = performance.now();
        const tick = (now: number) => {
            const pct = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - pct, 3);
            setDisplay(Math.round(to * ease));
            if (pct < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [to, duration]);

    return <>{display.toLocaleString()}{suffix}</>;
}

function StatRow({
    icon,
    label,
    value,
    delay = 0,
    highlight = false,
}: {
    icon: string;
    label: string;
    value: number;
    delay?: number;
    highlight?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.28, ease: "easeOut" }}
            className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2",
                highlight ? "border border-yellow-200 bg-yellow-50" : "bg-white/60"
            )}
        >
            <span className="w-6 text-center text-base">{icon}</span>
            <span className="flex-1 text-xs font-bold text-slate-600">{label}</span>
            <span className={cn("text-sm font-black tabular-nums", highlight ? "text-yellow-700" : "text-slate-800")}>
                <CountUp to={value} />
            </span>
        </motion.div>
    );
}

function FloatingCoin({ delay }: { delay: number }) {
    const seed = Math.round(delay * 1000) + 17;
    const initialX = Math.sin(seed * 0.37) * 30;
    const finalX = Math.cos(seed * 0.53) * 40;
    const left = 30 + ((Math.sin(seed * 0.19) + 1) / 2) * 40;

    return (
        <motion.div
            initial={{ opacity: 1, y: 0, x: initialX }}
            animate={{ opacity: 0, y: -60, x: finalX }}
            transition={{ delay, duration: 1.1, ease: "easeOut" }}
            className="pointer-events-none absolute"
            style={{ left: `${left}%`, bottom: "20%" }}
        >
            <Coins className="h-5 w-5 text-yellow-500 drop-shadow-sm" />
        </motion.div>
    );
}

export function BattleResultScreen({
    isWinner,
    goldReward,
    stats,
    playerName,
    playerFormIcon,
    opponentName,
    opponentFormIcon,
    onRematch,
}: BattleResultScreenProps) {
    const [showCoins, setShowCoins] = useState(false);
    const [coinKeys] = useState(() => Array.from({ length: 8 }, (_, index) => index));

    useEffect(() => {
        if (isWinner) {
            const timer = setTimeout(() => setShowCoins(true), 600);
            return () => clearTimeout(timer);
        }
    }, [isWinner]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
        >
            <div
                className={cn(
                    "relative overflow-hidden rounded-3xl border-4 p-5 text-center",
                    isWinner
                        ? "bg-gradient-to-b from-yellow-300 via-amber-200 to-yellow-100 border-yellow-400"
                        : "bg-gradient-to-b from-slate-200 via-slate-100 to-white border-slate-300"
                )}
            >
                <div
                    className={cn(
                        "absolute inset-0 opacity-30 blur-2xl",
                        isWinner ? "bg-yellow-400" : "bg-slate-300"
                    )}
                />

                <AnimatePresence>
                    {showCoins && coinKeys.map((key) => (
                        <FloatingCoin key={key} delay={key * 0.08} />
                    ))}
                </AnimatePresence>

                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="relative z-10 mb-3 flex items-center justify-center gap-3"
                >
                    <NegamonFormIcon
                        icon={playerFormIcon}
                        label={playerName}
                        className={cn("h-14 w-14 drop-shadow-lg", isWinner ? "" : "opacity-40 grayscale")}
                        emojiClassName="text-5xl"
                        width={56}
                        height={56}
                        imageClassName="h-full w-full object-contain"
                    />
                    <Swords className={cn("h-5 w-5 shrink-0", isWinner ? "text-yellow-600" : "text-slate-400")} />
                    <NegamonFormIcon
                        icon={opponentFormIcon}
                        label={opponentName}
                        className={cn("h-14 w-14 drop-shadow-lg", isWinner ? "opacity-40 grayscale" : "")}
                        emojiClassName="text-5xl"
                        width={56}
                        height={56}
                        imageClassName="h-full w-full object-contain"
                    />
                </motion.div>

                <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="relative z-10"
                >
                    <p className={cn("mb-0.5 text-3xl font-black tracking-tight", isWinner ? "text-yellow-800" : "text-slate-500")}>
                        {isWinner ? "🏆 ชนะ!" : "💀 แพ้"}
                    </p>
                    <p className={cn("text-xs font-bold", isWinner ? "text-yellow-700" : "text-slate-400")}>
                        {isWinner ? `${playerName} เอาชนะ ${opponentName}!` : `${opponentName} เอาชนะ ${playerName}`}
                    </p>
                </motion.div>

                {isWinner && (
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 320 }}
                        className="relative z-10 mt-3 inline-flex items-center gap-2 rounded-2xl border-2 border-yellow-500 bg-yellow-400/80 px-4 py-1.5 shadow-md"
                    >
                        <Coins className="h-5 w-5 text-yellow-800" />
                        <span className="text-xl font-black tabular-nums text-yellow-900">
                            +<CountUp to={goldReward} duration={700} />G
                        </span>
                    </motion.div>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-1.5 rounded-2xl border-2 border-slate-100 bg-slate-50/80 p-3"
            >
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    สรุปการต่อสู้
                </p>
                <StatRow icon="⚔️"  label="ความเสียหายที่ทำได้"  value={stats.damageDealt}    delay={0.30} highlight={isWinner} />
                <StatRow icon="🛡️"  label="ความเสียหายที่รับ"     value={stats.damageReceived} delay={0.36} />
                <StatRow icon="⚡"  label="คริติคอล"              value={stats.critCount}      delay={0.42} />
                {stats.healsUsed > 0 && (
                    <StatRow icon="💚" label="ฟื้นฟู HP รวม"     value={stats.healsUsed}      delay={0.48} />
                )}
                <StatRow icon="🔄"  label="จำนวนตาที่ต่อสู้"      value={stats.turnCount}      delay={0.54} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-2"
            >
                <button
                    type="button"
                    onClick={onRematch}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-[3px] border-indigo-700 bg-gradient-to-b from-indigo-400 to-indigo-600 py-3 text-sm font-black text-white shadow-md active:translate-y-[3px] active:border-b-0"
                >
                    <RotateCcw className="h-4 w-4" />
                    ท้าทายใหม่
                </button>
            </motion.div>
        </motion.div>
    );
}

