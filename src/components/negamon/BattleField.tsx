"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

// ── Type chart colors for arena tinting ──────────────────────

const TYPE_ARENA: Record<string, { sky: string; ground: string; glow: string }> = {
    FIRE:    { sky: "from-orange-300 via-red-200 to-amber-100",    ground: "from-orange-900 via-orange-700 to-amber-600",   glow: "#f97316" },
    WATER:   { sky: "from-sky-400 via-blue-200 to-cyan-100",       ground: "from-blue-900 via-blue-700 to-sky-600",         glow: "#0ea5e9" },
    EARTH:   { sky: "from-amber-300 via-yellow-200 to-lime-100",   ground: "from-green-900 via-green-700 to-lime-600",      glow: "#84cc16" },
    WIND:    { sky: "from-cyan-300 via-teal-100 to-sky-100",       ground: "from-teal-800 via-emerald-700 to-teal-500",     glow: "#06b6d4" },
    THUNDER: { sky: "from-yellow-300 via-amber-100 to-yellow-50",  ground: "from-yellow-900 via-amber-700 to-yellow-600",   glow: "#eab308" },
    LIGHT:   { sky: "from-amber-200 via-yellow-100 to-white",      ground: "from-amber-700 via-yellow-600 to-amber-400",    glow: "#f59e0b" },
    DARK:    { sky: "from-purple-900 via-slate-700 to-indigo-800", ground: "from-slate-900 via-purple-900 to-slate-800",    glow: "#7c3aed" },
    PSYCHIC: { sky: "from-pink-400 via-purple-200 to-pink-100",    ground: "from-pink-900 via-purple-700 to-pink-600",      glow: "#ec4899" },
};

const DEFAULT_ARENA = {
    sky:    "from-blue-400 via-sky-200 to-blue-100",
    ground: "from-green-900 via-green-700 to-emerald-600",
    glow:   "#6366f1",
};

// ── Monster Sprite ────────────────────────────────────────────

interface MonsterSpriteProps {
    icon: string;
    side: "player" | "opponent";
    isAttacking: boolean;
    isHurt: boolean;
    isFainted: boolean;
    glowColor?: string;
}

function MonsterSprite({ icon, side, isAttacking, isHurt, isFainted, glowColor }: MonsterSpriteProps) {
    const isPlayer = side === "player";

    return (
        <motion.div
            className={cn(
                "relative select-none",
                isPlayer ? "self-end" : "self-start"
            )}
            animate={
                isFainted   ? { opacity: 0, y: 40, scale: 0.7 } :
                isAttacking ? { x: isPlayer ? -30 : 30, scale: 1.15 } :
                isHurt      ? { x: [0, 10, -10, 8, -8, 0], scale: [1, 0.95, 1] } :
                { x: 0, scale: 1 }
            }
            transition={
                isFainted   ? { duration: 0.6, ease: "easeIn" } :
                isAttacking ? { duration: 0.2, ease: "easeOut" } :
                isHurt      ? { duration: 0.35 } :
                { duration: 0.2 }
            }
        >
            {/* Idle float animation wrapper */}
            <motion.div
                animate={isFainted ? {} : { y: [0, -6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: isPlayer ? 0 : 0.8 }}
            >
                {/* Hurt flash overlay */}
                <AnimatePresence>
                    {isHurt && (
                        <motion.div
                            key="hurt-flash"
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 rounded-full bg-red-400 mix-blend-multiply z-10"
                        />
                    )}
                </AnimatePresence>

                {/* Glow shadow */}
                <div
                    className={cn(
                        "flex items-center justify-center rounded-full",
                        isPlayer ? "h-24 w-24" : "h-28 w-28"
                    )}
                    style={{
                        filter: `drop-shadow(0 0 18px ${glowColor ?? "#6366f1"}88)`,
                        transform: isPlayer ? "scaleX(-1)" : undefined,
                    }}
                >
                    <NegamonFormIcon
                        icon={icon}
                        className="h-full w-full"
                        emojiClassName={isPlayer ? "text-6xl" : "text-7xl"}
                        width={isPlayer ? 96 : 112}
                        height={isPlayer ? 96 : 112}
                        imageClassName="h-full w-full max-h-[90%] max-w-[90%] object-contain"
                    />
                </div>

                {/* Ground shadow */}
                <div
                    className="mx-auto mt-1 rounded-full bg-black/20 blur-sm"
                    style={{ width: isPlayer ? "60%" : "70%", height: 8 }}
                />
            </motion.div>
        </motion.div>
    );
}

// ── Attack Flash Effect ───────────────────────────────────────

interface AttackFlashProps {
    active: boolean;
    side: "player" | "opponent";
    color?: string;
}

function AttackFlash({ active, side, color = "#ffffff" }: AttackFlashProps) {
    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    key="flash"
                    initial={{ opacity: 0.7, scale: 0.5 }}
                    animate={{ opacity: 0, scale: 2.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                        "absolute pointer-events-none rounded-full z-20",
                        side === "player" ? "bottom-8 left-8" : "top-8 right-8"
                    )}
                    style={{
                        width: 80,
                        height: 80,
                        background: `radial-gradient(circle, ${color}cc 0%, transparent 70%)`,
                    }}
                />
            )}
        </AnimatePresence>
    );
}

// ── Status Floating Text ──────────────────────────────────────

interface FloatingTextProps {
    text: string;
    side: "player" | "opponent";
    color?: string;
    show: boolean;
}

export function FloatingText({ text, side, color = "#ef4444", show }: FloatingTextProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    key={text}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: side === "player" ? 40 : -40 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className={cn(
                        "absolute z-30 font-black text-sm pointer-events-none select-none",
                        side === "player" ? "bottom-24 left-12" : "top-24 right-12"
                    )}
                    style={{ color, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                >
                    {text}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ── Main BattleField ──────────────────────────────────────────

export interface BattleFieldFighter {
    studentId: string;
    formIcon: string;
    formName: string;
    type: string;
    currentHp: number;
    maxHp: number;
    isFainted?: boolean;
}

interface BattleFieldProps {
    player: BattleFieldFighter;
    opponent: BattleFieldFighter;
    attackingId: string | null;
    hurtId: string | null;
    faintedId: string | null;
    flashId: string | null;
    floatingDmg?: { id: string; value: number; crit?: boolean } | null;
}

export function BattleField({
    player,
    opponent,
    attackingId,
    hurtId,
    faintedId,
    flashId,
    floatingDmg,
}: BattleFieldProps) {
    const playerArena  = TYPE_ARENA[player.type]   ?? DEFAULT_ARENA;
    const opponentArena = TYPE_ARENA[opponent.type] ?? DEFAULT_ARENA;

    // Blend two arena colors — use attacker's type for sky
    const skyGradient    = playerArena.sky;
    const groundGradient = opponentArena.ground;

    return (
        <div className="relative w-full overflow-hidden rounded-[1.5rem] select-none" style={{ aspectRatio: "16/9", minHeight: 200, maxHeight: 320 }}>

            {/* Sky */}
            <div className={cn("absolute inset-0 bg-gradient-to-b", skyGradient)} />

            {/* Horizon line / ground */}
            <div className="absolute bottom-0 left-0 right-0 h-[42%]">
                <div className={cn("absolute inset-0 bg-gradient-to-b", groundGradient)} />
                {/* Ground highlight stripe */}
                <div className="absolute top-0 left-0 right-0 h-[6px] bg-white/10" />
                {/* Hex tile pattern overlay */}
                <div className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: "repeating-linear-gradient(60deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 12px)",
                    }}
                />
            </div>

            {/* Platform spots */}
            <div className="absolute bottom-[38%] left-[12%] w-24 h-6 rounded-full bg-black/15 blur-md" />
            <div className="absolute bottom-[52%] right-[10%] w-28 h-6 rounded-full bg-black/15 blur-md" />

            {/* Attack flash effects */}
            <AttackFlash
                active={flashId === player.studentId}
                side="player"
                color={playerArena.glow}
            />
            <AttackFlash
                active={flashId === opponent.studentId}
                side="opponent"
                color={opponentArena.glow}
            />

            {/* Floating damage numbers */}
            {floatingDmg && (
                <>
                    <FloatingText
                        text={floatingDmg.crit ? `💥 ${floatingDmg.value}!!` : `-${floatingDmg.value}`}
                        side={floatingDmg.id === player.studentId ? "player" : "opponent"}
                        color={floatingDmg.crit ? "#f59e0b" : "#ef4444"}
                        show
                    />
                </>
            )}

            {/* Monsters */}
            <div className="absolute inset-0 flex items-end justify-between px-6 pb-[14%]">

                {/* Player — bottom-left, slightly smaller, mirrored */}
                <MonsterSprite
                    icon={player.formIcon}
                    side="player"
                    isAttacking={attackingId === player.studentId}
                    isHurt={hurtId === player.studentId}
                    isFainted={faintedId === player.studentId}
                    glowColor={playerArena.glow}
                />

                {/* Opponent — top-right, larger */}
                <div className="flex items-start self-start pt-4">
                    <MonsterSprite
                        icon={opponent.formIcon}
                        side="opponent"
                        isAttacking={attackingId === opponent.studentId}
                        isHurt={hurtId === opponent.studentId}
                        isFainted={faintedId === opponent.studentId}
                        glowColor={opponentArena.glow}
                    />
                </div>
            </div>

            {/* VS badge center */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-black/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-black text-white/80">
                    ⚔️ VS
                </span>
            </div>
        </div>
    );
}
