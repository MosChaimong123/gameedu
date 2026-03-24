"use client";

import { Ear, EarOff, Waves, WavesLadder } from "lucide-react";

import { Button } from "@/components/ui/button";

type BattleAccessibilityToggleProps = {
  reducedMotion: boolean;
  reducedSound: boolean;
  onToggleReducedMotion: () => void;
  onToggleReducedSound: () => void;
};

export function BattleAccessibilityToggle({
  reducedMotion,
  reducedSound,
  onToggleReducedMotion,
  onToggleReducedSound,
}: BattleAccessibilityToggleProps) {
  return (
    <div className="fixed right-4 top-[4.75rem] z-[70] flex flex-col gap-2 sm:right-6 sm:top-[5.25rem]">
      <Button
        type="button"
        variant="outline"
        onClick={onToggleReducedMotion}
        className="h-11 justify-start gap-2 rounded-2xl border-white/15 bg-slate-950/70 px-4 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.95)] backdrop-blur-xl hover:bg-slate-900/80"
        aria-pressed={reducedMotion}
      >
        {reducedMotion ? <WavesLadder className="h-4 w-4" /> : <Waves className="h-4 w-4" />}
        <span className="text-xs font-bold">{reducedMotion ? "Motion ต่ำ" : "Motion ปกติ"}</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onToggleReducedSound}
        className="h-11 justify-start gap-2 rounded-2xl border-white/15 bg-slate-950/70 px-4 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.95)] backdrop-blur-xl hover:bg-slate-900/80"
        aria-pressed={reducedSound}
      >
        {reducedSound ? <EarOff className="h-4 w-4" /> : <Ear className="h-4 w-4" />}
        <span className="text-xs font-bold">{reducedSound ? "Sound เบา" : "Sound ปกติ"}</span>
      </Button>
    </div>
  );
}
