"use client";

import { useCallback, useEffect, useRef } from "react";
import type { QuizIntegrityEventType } from "@/lib/quiz-integrity";

export type QuizIntegrityClientEvent = { type: QuizIntegrityEventType; t: number };

const THROTTLE_MS_BY_TYPE: Partial<Record<QuizIntegrityEventType, number>> = {
  window_blur: 800,
  document_hidden: 400,
  copy: 300,
  paste: 300,
  context_menu: 500,
};

/**
 * เก็บเหตุการณ์ระหว่างทำข้อสอบ (แท็บ/หน้าต่าง/คัดลอก/วาง/คลิกขวา)
 * ไม่บล็อกการทำงาน — ส่งไปกับ submit เพื่อให้ครูนำไปพิจารณาได้
 */
export function useQuizIntegrity(active: boolean) {
  const eventsRef = useRef<QuizIntegrityClientEvent[]>([]);
  const lastRef = useRef<Partial<Record<QuizIntegrityEventType, number>>>({});

  const push = useCallback((type: QuizIntegrityEventType) => {
    const now = Date.now();
    const throttle = THROTTLE_MS_BY_TYPE[type] ?? 0;
    const prev = lastRef.current[type] ?? 0;
    if (now - prev < throttle) return;
    lastRef.current[type] = now;
    eventsRef.current.push({ type, t: now });
  }, []);

  useEffect(() => {
    if (!active) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") push("document_hidden");
    };

    const onBlur = () => push("window_blur");
    const onCopy = () => push("copy");
    const onPaste = () => push("paste");
    const onContextMenu = () => push("context_menu");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("contextmenu", onContextMenu, true);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
    };
  }, [active, push]);

  const getPayload = useCallback(() => ({ events: [...eventsRef.current] }), []);

  return { getPayload };
}
