"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { parseUserSettings } from "@/lib/user-settings";

const REDUCED_MOTION_OVERRIDE_KEY = "gamedu-accessibility-reduced-motion";
const REDUCED_SOUND_OVERRIDE_KEY = "gamedu-accessibility-reduced-sound";

type AccessibilityContextValue = {
  reducedMotion: boolean;
  reducedSound: boolean;
  setReducedMotion: (value: boolean) => void;
  setReducedSound: (value: boolean) => void;
  toggleReducedMotion: () => void;
  toggleReducedSound: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

function readStoredPreference(key: string): boolean | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(key);
  if (value == null) return null;
  return value === "true";
}

function persistStoredPreference(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(value));
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const saveTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  const sessionSettings = parseUserSettings(
    (session?.user as { settings?: unknown } | undefined)?.settings
  );

  // Keep first SSR/client render deterministic; sync browser preferences after mount.
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const [soundOverride, setSoundOverride] = useState<boolean | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const reducedMotion =
    motionOverride ?? sessionSettings.accessibility?.reducedMotion ?? prefersReducedMotion;
  const reducedSound =
    soundOverride ?? sessionSettings.accessibility?.reducedSound ?? false;

  useEffect(() => {
    hydratedRef.current = true;

    setMotionOverride(readStoredPreference(REDUCED_MOTION_OVERRIDE_KEY));
    setSoundOverride(readStoredPreference(REDUCED_SOUND_OVERRIDE_KEY));

    if (typeof window !== "undefined") {
      setPrefersReducedMotion(
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;

    const handleChange = (event: MediaQueryListEvent) => {
      if (motionOverride == null) {
        setPrefersReducedMotion(event.matches);
      }
    };

    media.addEventListener?.("change", handleChange);
    return () => {
      media.removeEventListener?.("change", handleChange);
    };
  }, [motionOverride]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.reducedMotion = reducedMotion ? "true" : "false";
    document.documentElement.dataset.reducedSound = reducedSound ? "true" : "false";
  }, [reducedMotion, reducedSound]);

  useEffect(() => {
    if (!hydratedRef.current || !session?.user?.id) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessibility: {
            reducedMotion,
            reducedSound,
          },
        }),
      }).catch(() => {});
    }, 300);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [reducedMotion, reducedSound, session?.user?.id]);

  const setReducedMotion = (value: boolean) => {
    persistStoredPreference(REDUCED_MOTION_OVERRIDE_KEY, value);
    setMotionOverride(value);
  };

  const setReducedSound = (value: boolean) => {
    persistStoredPreference(REDUCED_SOUND_OVERRIDE_KEY, value);
    setSoundOverride(value);
  };

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      reducedMotion,
      reducedSound,
      setReducedMotion,
      setReducedSound,
      toggleReducedMotion: () => setReducedMotion(!reducedMotion),
      toggleReducedSound: () => setReducedSound(!reducedSound),
    }),
    [reducedMotion, reducedSound]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}
