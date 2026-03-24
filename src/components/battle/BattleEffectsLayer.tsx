"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { SkillFxPreset } from "@/components/battle/battle-animation-map";

type ActiveFx = {
  id: string;
  label: string;
  preset: SkillFxPreset;
  colorClass: string;
  target: "player" | "enemy" | "center";
};

type BattleEffectsLayerProps = {
  activeFx: ActiveFx | null;
  reducedMotion?: boolean;
};

export function BattleEffectsLayer({ activeFx, reducedMotion = false }: BattleEffectsLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <AnimatePresence>
        {activeFx ? (
          <motion.div
            key={activeFx.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.65 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.1 }}
            className={`absolute ${
              activeFx.target === "player"
                ? "left-[16%] top-[28%]"
                : activeFx.target === "enemy"
                  ? "right-[16%] top-[20%]"
                  : "left-1/2 top-[22%] -translate-x-1/2"
            }`}
          >
            <div className="relative h-36 w-36 sm:h-44 sm:w-44">
              <motion.div
                animate={reducedMotion
                  ? { opacity: 0.82, scale: 1 }
                  : activeFx.preset === "thunder"
                    ? { rotate: [0, 10, -12, 0], scale: [0.92, 1.08, 1] }
                    : activeFx.preset === "slash" || activeFx.preset === "pierce" || activeFx.preset === "execute"
                      ? { rotate: [0, 18, -6, 0], x: [0, 12, -6, 0] }
                      : { scale: [0.86, 1.08, 1], opacity: [0.4, 0.95, 0.7] }
                }
                transition={{ duration: reducedMotion ? 0.18 : 0.55, ease: "easeOut" }}
                className={`absolute inset-0 rounded-full bg-gradient-to-br blur-2xl ${activeFx.colorClass}`}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-4 rounded-full border border-white/25"
              />

              <motion.div
                animate={reducedMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 2.2, ease: "linear", repeat: Infinity }}
                className="absolute inset-6 rounded-full border border-dashed border-white/20"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
