"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

export interface DialogueBadge {
    label: string;
    /** Tailwind bg + text classes, e.g. "bg-red-100 text-red-600" */
    color: string;
}

export interface DialogueLine {
    text: string;
    badges?: DialogueBadge[];
}

interface DialogueBoxProps {
    /** Lines accumulate — never shrinks during a battle. */
    lines: DialogueLine[];
    /** Characters per second (default 40). */
    cps?: number;
    /** ms to wait after a line finishes before auto-advancing (0 = manual only). */
    autoAdvanceMs?: number;
    className?: string;
    onAllRead?: () => void;
}

// ── Component ─────────────────────────────────────────────────

export function DialogueBox({
    lines,
    cps = 40,
    autoAdvanceMs = 1400,
    className,
    onAllRead,
}: DialogueBoxProps) {
    const [lineIdx, setLineIdx]   = useState(0);
    const [charIdx, setCharIdx]   = useState(0);
    const onAllReadRef = useRef(onAllRead);

    useEffect(() => {
        onAllReadRef.current = onAllRead;
    }, [onAllRead]);

    // When lines array grows, do NOT reset — just let the current position continue.
    // When lines shrinks to 0 (reset / new battle), restart.
    const prevLenRef = useRef(lines.length);
    useEffect(() => {
        if (lines.length === 0) {
            const timer = window.setTimeout(() => {
                setLineIdx(0);
                setCharIdx(0);
            }, 0);
            prevLenRef.current = lines.length;
            return () => window.clearTimeout(timer);
        }
        prevLenRef.current = lines.length;
    }, [lines.length]);

    const currentLine = lines[lineIdx];
    const fullText    = currentLine?.text ?? "";
    const isTyping    = charIdx < fullText.length;
    const isLastLine  = lineIdx >= lines.length - 1;

    // ── Typewriter ───────────────────────────────────────────
    useEffect(() => {
        if (!isTyping) return;
        const delay = Math.round(1000 / cps);
        const timer = setTimeout(() => setCharIdx((c) => c + 1), delay);
        return () => clearTimeout(timer);
    }, [charIdx, isTyping, cps]);

    // ── Auto-advance after line finishes ─────────────────────
    useEffect(() => {
        if (isTyping || !autoAdvanceMs) return;
        if (isLastLine) {
            onAllReadRef.current?.();
            return;
        }
        const timer = setTimeout(() => {
            setLineIdx((i) => i + 1);
            setCharIdx(0);
        }, autoAdvanceMs);
        return () => clearTimeout(timer);
    }, [isTyping, isLastLine, autoAdvanceMs]);

    // ── Tap / click to skip ───────────────────────────────────
    const handleTap = useCallback(() => {
        if (isTyping) {
            // Skip to end of current line
            setCharIdx(fullText.length);
        } else if (!isLastLine) {
            setLineIdx((i) => i + 1);
            setCharIdx(0);
        } else {
            onAllReadRef.current?.();
        }
    }, [isTyping, fullText.length, isLastLine]);

    if (!currentLine) return null;

    const displayedText = fullText.slice(0, charIdx);
    const showBadges    = !isTyping && (currentLine.badges?.length ?? 0) > 0;

    return (
        <motion.div
            layout
            onClick={handleTap}
            className={cn(
                "relative cursor-pointer rounded-2xl border-[3px] border-slate-800 bg-white px-4 py-3",
                "shadow-[3px_3px_0px_0px_rgba(15,23,42,0.35)] select-none",
                "min-h-[64px]",
                className
            )}
        >
            {/* Progress dots */}
            {lines.length > 1 && (
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                    {lines.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1 rounded-full transition-all duration-200",
                                i < lineIdx  ? "w-1 bg-slate-400" :
                                i === lineIdx ? "w-3 bg-slate-800" :
                                               "w-1 bg-slate-200"
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Text + badges row */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-bold leading-snug text-slate-800">
                    {displayedText}
                    {/* Blinking cursor while typing */}
                    {isTyping && (
                        <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.45, repeat: Infinity, repeatType: "reverse" }}
                            className="ml-px inline-block h-[13px] w-[2px] translate-y-[1px] bg-slate-700 align-middle"
                        />
                    )}
                </p>

                {/* Badges pop in after text is done */}
                <AnimatePresence>
                    {showBadges &&
                        currentLine.badges!.map((badge, bi) => (
                            <motion.span
                                key={bi}
                                initial={{ opacity: 0, scale: 0.6, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: bi * 0.08, type: "spring", stiffness: 400 }}
                                className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-black leading-none",
                                    badge.color
                                )}
                            >
                                {badge.label}
                            </motion.span>
                        ))}
                </AnimatePresence>
            </div>

            {/* ▼ next-line indicator */}
            {!isTyping && !isLastLine && (
                <motion.span
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 0.65, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-1.5 right-3 text-[11px] font-black text-slate-400"
                >
                    ▼
                </motion.span>
            )}

            {/* ■ done indicator on last line */}
            {!isTyping && isLastLine && (
                <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    className="absolute bottom-1.5 right-3 text-[10px] font-black text-slate-300"
                >
                    ■
                </motion.span>
            )}
        </motion.div>
    );
}
