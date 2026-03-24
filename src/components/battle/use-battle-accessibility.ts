"use client";

import { useEffect, useState } from "react";

const REDUCED_MOTION_KEY = "gamedu-battle-reduced-motion";
const REDUCED_SOUND_KEY = "gamedu-battle-reduced-sound";

function readStoredFlag(key: string): boolean | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(key);
  if (value == null) return null;
  return value === "true";
}

export function useBattleAccessibility() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;

    const stored = readStoredFlag(REDUCED_MOTION_KEY);
    if (stored != null) return stored;

    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });

  const [reducedSound, setReducedSound] = useState(() => {
    if (typeof window === "undefined") return false;
    return readStoredFlag(REDUCED_SOUND_KEY) ?? false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(REDUCED_MOTION_KEY, String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(REDUCED_SOUND_KEY, String(reducedSound));
  }, [reducedSound]);

  return {
    reducedMotion,
    reducedSound,
    toggleReducedMotion: () => setReducedMotion((current) => !current),
    toggleReducedSound: () => setReducedSound((current) => !current),
  };
}
