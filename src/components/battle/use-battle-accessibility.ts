"use client";

import { useAccessibility } from "@/components/providers/accessibility-provider";

export function useBattleAccessibility() {
  const {
    reducedMotion,
    reducedSound,
    toggleReducedMotion,
    toggleReducedSound,
  } = useAccessibility();

  return {
    reducedMotion,
    reducedSound,
    toggleReducedMotion,
    toggleReducedSound,
  };
}
