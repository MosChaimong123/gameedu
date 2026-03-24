"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { FloatingPopup } from "@/components/battle/use-battle-animation";

type DamagePopupLayerProps = {
  popups: FloatingPopup[];
  reducedMotion?: boolean;
};

const anchorClassMap = {
  player: "left-[20%] top-[42%]",
  enemy: "right-[20%] top-[34%]",
  center: "left-1/2 top-[24%] -translate-x-1/2",
};

const toneClassMap = {
  damage: "text-rose-300",
  crit: "text-amber-300",
  heal: "text-emerald-300",
  resource: "text-sky-300",
  status: "text-violet-300",
};

export function DamagePopupLayer({ popups, reducedMotion = false }: DamagePopupLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <AnimatePresence>
        {popups.map((popup) => (
          <motion.div
            key={popup.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.85 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: -8, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -36, scale: 1.06 }}
            transition={{ duration: reducedMotion ? 0.18 : 0.75, ease: "easeOut" }}
            className={`absolute ${anchorClassMap[popup.anchor]} ${toneClassMap[popup.tone]}`}
          >
            <div className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-sm font-black shadow-[0_12px_40px_-20px_rgba(15,23,42,0.9)] backdrop-blur-sm sm:text-lg">
              {popup.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
