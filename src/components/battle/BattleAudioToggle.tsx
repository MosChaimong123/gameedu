"use client";

import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";

export function BattleAudioToggle() {
  const { isMuted, toggleMute } = useSound();

  return (
    <div className="fixed right-4 top-4 z-[70] sm:right-6 sm:top-6">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleMute}
        className="h-12 w-12 rounded-2xl border-white/15 bg-slate-950/70 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.95)] backdrop-blur-xl hover:bg-slate-900/80"
        aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
        title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </Button>
    </div>
  );
}
