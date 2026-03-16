"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, X } from "lucide-react";

interface ClassEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  multiplier: number;
  startAt: string;
  endAt: string;
  active: boolean;
}

export function EventBanner({ classId }: { classId: string }) {
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/classroom/${classId}/events`)
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d.filter((e: ClassEvent) => e.active) : []));
  }, [classId]);

  const visible = events.filter(e => !dismissed.has(e.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visible.map(event => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            className="relative overflow-hidden rounded-2xl border-2 border-amber-300/60 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-4 shadow-lg shadow-amber-100/50"
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />

            <div className="flex items-center gap-4">
              <div className="text-3xl shrink-0 animate-bounce">{event.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <p className="font-black text-amber-800 text-sm">{event.title}</p>
                  {event.multiplier > 1 && (
                    <span className="text-[10px] font-black text-white bg-amber-500 px-2 py-0.5 rounded-full animate-pulse">
                      x{event.multiplier}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-amber-700/80 font-medium line-clamp-1">{event.description}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600 font-bold">
                    สิ้นสุด {new Date(event.endAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, event.id]))}
                className="shrink-0 w-6 h-6 rounded-full bg-amber-200/60 flex items-center justify-center hover:bg-amber-300/60 transition-colors"
              >
                <X className="w-3 h-3 text-amber-700" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
