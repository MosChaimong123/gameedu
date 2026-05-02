"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NegamonFormIcon } from "@/components/negamon/NegamonFormIcon";

// ── Types ─────────────────────────────────────────────────────

export interface DialogueBadge {
    label: string;
    /** Tailwind bg + text classes, e.g. "bg-red-100 text-red-600" */
    color: string;
}

export interface DialogueLine {
    text: string;
    badges?: DialogueBadge[];
    actor?: string;
    actorIcon?: string;
    skill?: string;
    damageText?: string;
    statusText?: string;
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
    showHistory?: boolean;
    historyLimit?: number;
}

function damageBadgeTone(value: string | undefined): string {
    const v = (value ?? "").toUpperCase();
    if (!v) return "bg-slate-100 text-slate-600";
    if (v.includes("EN ")) return "bg-amber-100 text-amber-700";
    if (v.includes("+")) return "bg-emerald-100 text-emerald-700";
    if (v.includes("STATUS") || v.includes("สถานะ")) return "bg-violet-100 text-violet-700";
    if (v.includes("DMG") || v.includes("HP")) {
        const m = v.match(/-?(\d+)/);
        const n = m ? Number(m[1]) : 0;
        if (n >= 60) return "bg-red-100 text-red-700";
        if (n >= 25) return "bg-orange-100 text-orange-700";
        return "bg-sky-100 text-sky-700";
    }
    return "bg-slate-100 text-slate-600";
}

// ── Component ─────────────────────────────────────────────────

export function DialogueBox({
    lines,
    cps = 40,
    autoAdvanceMs = 1400,
    className,
    onAllRead,
    showHistory = false,
    historyLimit = 8,
}: DialogueBoxProps) {
    const [lineIdx, setLineIdx]   = useState(0);
    const [charIdx, setCharIdx]   = useState(0);
    const onAllReadRef = useRef(onAllRead);
    const historyScrollRef = useRef<HTMLDivElement | null>(null);

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

    const displayedText = fullText.slice(0, charIdx);
    const showBadges    = !isTyping && (currentLine?.badges?.length ?? 0) > 0;
    const hasStructuredLayout = Boolean(
        currentLine?.actor || currentLine?.skill || currentLine?.damageText || currentLine?.statusText
    );
    const historyLines = showHistory
        ? lines.slice(Math.max(0, lineIdx - historyLimit), lineIdx)
        : [];

    useEffect(() => {
        if (!showHistory) return;
        const node = historyScrollRef.current;
        if (!node) return;
        node.scrollTop = node.scrollHeight;
    }, [showHistory, historyLines.length, lineIdx]);

    if (!currentLine) return null;

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
            {/* History list (older lines) */}
            {showHistory && historyLines.length > 0 && (
                <div
                    ref={historyScrollRef}
                    className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-2"
                >
                    <div className="space-y-1.5">
                        {historyLines.map((line, index) => (
                            <div key={`${line.text}-${index}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                                <div className="flex items-start gap-2">
                                    {line.actorIcon ? (
                                        <NegamonFormIcon
                                            icon={line.actorIcon}
                                            label={line.actor ?? "actor"}
                                            className="h-5 w-5 shrink-0"
                                            emojiClassName="text-sm leading-none"
                                            width={20}
                                            height={20}
                                            imageClassName="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
                                            {line.actor?.charAt(0) ?? "?"}
                                        </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-1.5">
                                            <p className="text-xs font-semibold text-slate-700">{line.text}</p>
                                            {line.damageText && (
                                                <span
                                                    className={cn(
                                                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black",
                                                        damageBadgeTone(line.damageText)
                                                    )}
                                                >
                                                    {line.damageText}
                                                </span>
                                            )}
                                        </div>
                                        {line.statusText && line.statusText !== line.text && (
                                            <p className="mt-0.5 text-[10px] font-semibold leading-snug text-slate-500">
                                                {line.statusText}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Current text + badges row */}
            <div className="mt-2">
                {hasStructuredLayout ? (
                    <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex items-center gap-1.5">
                                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                                    {currentLine.actor ?? "EVENT"}
                                </span>
                                <p className="truncate text-sm font-black text-slate-800">
                                    {currentLine.skill ?? displayedText}
                                    {isTyping && (
                                        <motion.span
                                            animate={{ opacity: [1, 0] }}
                                            transition={{ duration: 0.45, repeat: Infinity, repeatType: "reverse" }}
                                            className="ml-px inline-block h-[13px] w-[2px] translate-y-[1px] bg-slate-700 align-middle"
                                        />
                                    )}
                                </p>
                            </div>
                            {(currentLine.damageText || !isTyping) && (
                                <span
                                    className={cn(
                                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-black",
                                        damageBadgeTone(currentLine.damageText)
                                    )}
                                >
                                    {currentLine.damageText ?? "—"}
                                </span>
                            )}
                        </div>
                        {currentLine.statusText && (
                            <p className="text-xs font-semibold text-slate-600">{currentLine.statusText}</p>
                        )}
                    </div>
                ) : (
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
                )}

                {/* Badges pop in after text is done */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
