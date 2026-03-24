"use client";

import { motion } from "framer-motion";
import { Shield, Sparkles, Swords, Snowflake, Zap, Droplets, Leaf, TriangleAlert, ShieldPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BattlePose, PersistentStatus } from "@/components/battle/use-battle-animation";

type BattleCharacterProps = {
  name: string;
  subtitle: string;
  hpText: string;
  resourceText?: string;
  side: "left" | "right";
  pose: BattlePose;
  statusEffects?: PersistentStatus[];
  reducedMotion?: boolean;
  variant: "player" | "enemy";
  accent: "amber" | "rose" | "indigo" | "emerald";
};

const accentMap = {
  amber: "from-amber-400/50 via-orange-300/25 to-transparent border-amber-300/60 text-amber-100",
  rose: "from-rose-500/50 via-fuchsia-400/20 to-transparent border-rose-300/50 text-rose-100",
  indigo: "from-indigo-500/45 via-sky-400/20 to-transparent border-indigo-300/50 text-indigo-100",
  emerald: "from-emerald-500/45 via-cyan-400/20 to-transparent border-emerald-300/50 text-emerald-100",
};

export function BattleCharacter({
  name,
  subtitle,
  hpText,
  resourceText,
  side,
  pose,
  statusEffects = [],
  reducedMotion = false,
  variant,
  accent,
}: BattleCharacterProps) {
  const direction = side === "left" ? 1 : -1;
  const statusStyleMap: Record<PersistentStatus["kind"], { ring: string; chip: string; icon: typeof Shield }> = {
    poison: {
      ring: "border-lime-300/35 bg-[radial-gradient(circle,rgba(132,204,22,0.22),transparent_58%)]",
      chip: "border-lime-300/30 bg-lime-500/15 text-lime-100",
      icon: Droplets,
    },
    stun: {
      ring: "border-yellow-300/35 bg-[radial-gradient(circle,rgba(250,204,21,0.18),transparent_58%)]",
      chip: "border-yellow-300/30 bg-yellow-500/15 text-yellow-100",
      icon: Zap,
    },
    shield: {
      ring: "border-sky-300/35 bg-[radial-gradient(circle,rgba(56,189,248,0.16),transparent_58%)]",
      chip: "border-sky-300/30 bg-sky-500/15 text-sky-100",
      icon: ShieldPlus,
    },
    regen: {
      ring: "border-emerald-300/35 bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_58%)]",
      chip: "border-emerald-300/30 bg-emerald-500/15 text-emerald-100",
      icon: Leaf,
    },
    buff: {
      ring: "border-violet-300/35 bg-[radial-gradient(circle,rgba(168,85,247,0.16),transparent_58%)]",
      chip: "border-violet-300/30 bg-violet-500/15 text-violet-100",
      icon: Sparkles,
    },
    debuff: {
      ring: "border-rose-300/35 bg-[radial-gradient(circle,rgba(244,63,94,0.16),transparent_58%)]",
      chip: "border-rose-300/30 bg-rose-500/15 text-rose-100",
      icon: TriangleAlert,
    },
    frost: {
      ring: "border-cyan-300/35 bg-[radial-gradient(circle,rgba(34,211,238,0.16),transparent_58%)]",
      chip: "border-cyan-300/30 bg-cyan-500/15 text-cyan-100",
      icon: Snowflake,
    },
  };

  return (
    <motion.div
      animate={reducedMotion
        ? pose === "defeated"
          ? { opacity: 0.45, scale: 0.94 }
          : pose === "hit"
            ? { opacity: 0.88 }
            : { opacity: 1 }
        : pose === "attack"
          ? { x: [0, 18 * direction, 0], y: [0, -6, 0], scale: [1, 1.03, 1] }
          : pose === "cast"
            ? { y: [0, -12, 0], scale: [1, 1.06, 1], rotate: [0, 1.5 * direction, 0] }
            : pose === "defend"
              ? { scale: [1, 1.04, 1], boxShadow: ["0 0 0 rgba(59,130,246,0)", "0 0 24px rgba(59,130,246,0.4)", "0 0 0 rgba(59,130,246,0)"] }
              : pose === "hit"
                ? { x: [0, -10 * direction, 8 * direction, 0], filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"] }
                : pose === "defeated"
                  ? { opacity: 0.45, y: 18, scale: 0.94, rotate: side === "left" ? -4 : 4 }
                  : { y: [0, -4, 0] }
      }
      transition={{ duration: reducedMotion ? 0.18 : pose === "idle" ? 2.4 : 0.42, repeat: reducedMotion ? 0 : pose === "idle" ? Infinity : 0, ease: "easeInOut" }}
      className="relative w-full max-w-[260px]"
    >
      <div className={cn("rounded-[28px] border bg-gradient-to-br p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.85)]", accentMap[accent])}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">{subtitle}</p>
            <h3 className="mt-1 text-2xl font-black text-white">{name}</h3>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white/80">
            {variant === "enemy" ? <Swords className="h-5 w-5" /> : pose === "defend" ? <Shield className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-white/15 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.5),rgba(255,255,255,0.08)_42%,rgba(15,23,42,0.1)_72%)]">
            {statusEffects.map((status, index) => (
              <motion.div
                key={status.id}
                animate={reducedMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 4 + index, ease: "linear", repeat: Infinity }}
                className={cn("absolute inset-1 rounded-full border", statusStyleMap[status.kind].ring)}
                style={{ animationDirection: index % 2 === 0 ? "normal" : "reverse" }}
              />
            ))}
            <div className="absolute inset-4 rounded-full border border-white/15" />
            <span className="text-5xl font-black uppercase text-white/90">{name.slice(0, 1)}</span>
          </div>
        </div>

        {statusEffects.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {statusEffects.map((status) => {
              const Icon = statusStyleMap[status.kind].icon;
              return (
                <motion.div
                  key={status.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold", statusStyleMap[status.kind].chip)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {status.label}
                </motion.div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 text-sm text-white/85">
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">HP</p>
            <p className="mt-1 font-bold">{hpText}</p>
          </div>
          {resourceText ? (
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Resource</p>
              <p className="mt-1 font-bold">{resourceText}</p>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
