"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

type BattleStageProps = {
  variant: "boss" | "farming";
  shakeKey: number;
  banner: { text: string; tone: "neutral" | "success" | "danger" | "skill" | "warning" } | null;
  reducedMotion?: boolean;
  children: ReactNode;
};

const bannerToneMap = {
  neutral: "from-slate-800/90 to-slate-700/80 border-white/10 text-white",
  success: "from-emerald-500/90 to-teal-500/80 border-emerald-200/30 text-white",
  danger: "from-rose-500/90 to-red-500/80 border-rose-200/30 text-white",
  skill: "from-violet-500/90 to-fuchsia-500/80 border-violet-200/30 text-white",
  warning: "from-amber-500/90 to-orange-500/80 border-amber-200/30 text-white",
};

export function BattleStage({ variant, shakeKey, banner, reducedMotion = false, children }: BattleStageProps) {
  return (
    <motion.div
      key={shakeKey}
      animate={reducedMotion ? { x: 0 } : { x: [0, -8, 8, -4, 4, 0] }}
      transition={{ duration: reducedMotion ? 0 : 0.32, ease: "easeOut" }}
      className={`relative min-h-[360px] overflow-hidden rounded-[32px] border border-white/10 shadow-[0_36px_90px_-50px_rgba(15,23,42,0.9)] ${
        variant === "boss"
          ? "bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.22),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))]"
          : "bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.22),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,94,89,0.92))]"
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.09),transparent_58%)]" />

      <AnimatePresence>
        {banner ? (
          <motion.div
            key={`${banner.text}-${shakeKey}`}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.92 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.95 }}
            className={`absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full border px-5 py-2 text-sm font-black shadow-[0_18px_40px_-24px_rgba(15,23,42,0.95)] backdrop-blur-sm ${bannerToneMap[banner.tone]}`}
          >
            {banner.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
