"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  BASE_CLASSES,
  ADVANCE_CLASS_OPTIONS,
  MASTER_CLASS_OPTIONS,
} from "@/lib/game/job-constants"

interface JobSelectionModalProps {
  studentId: string
  level: number
  jobClass: string | null
  jobTier: string
  advanceClass: string | null
  onClose: () => void
  onJobSelected: () => void
}

const CLASS_ICONS: Record<string, string> = {
  WARRIOR: "⚔️",
  MAGE: "🔮",
  RANGER: "🏹",
  HEALER: "✨",
  ROGUE: "🗡️",
  KNIGHT: "🛡️",
  BERSERKER: "🪓",
  ARCHMAGE: "🌟",
  WARLOCK: "💀",
  SNIPER: "🎯",
  BEASTMASTER: "🐉",
  SAINT: "😇",
  DRUID: "🌿",
  ASSASSIN: "🌑",
  DUELIST: "⚡",
  PALADIN: "🌟",
  GUARDIAN: "🛡️",
  WARLORD: "👑",
  "DEATH KNIGHT": "💀",
  "GRAND WIZARD": "🔮",
  ELEMENTALIST: "🌊",
  LICH: "💀",
  "SHADOW MAGE": "🌑",
  HAWKEYE: "👁️",
  DEADEYE: "🎯",
  "BEAST KING": "🦁",
  TAMER: "🐾",
  ARCHBISHOP: "✝️",
  "DIVINE HERALD": "😇",
  "ELDER DRUID": "🌳",
  "NATURE WARDEN": "🌿",
  "SHADOW LORD": "🌑",
  PHANTOM: "👻",
  "BLADE MASTER": "⚔️",
  "SWORD SAINT": "🗡️",
}

const CLASS_DESCRIPTIONS: Record<string, string> = {
  WARRIOR: "Tank & melee fighter. High HP and DEF.",
  MAGE: "Spellcaster. Devastating MAG damage.",
  RANGER: "Swift attacker. High SPD and CRIT.",
  HEALER: "Support class. Heals allies and buffs MAG.",
  ROGUE: "Assassin. Extreme CRIT and SPD.",
  KNIGHT: "Defensive warrior. Protects allies.",
  BERSERKER: "Rage-fueled attacker. Pure offense.",
  ARCHMAGE: "Master of arcane arts.",
  WARLOCK: "Dark magic wielder.",
  SNIPER: "Long-range precision striker.",
  BEASTMASTER: "Commands beasts in battle.",
  SAINT: "Holy healer and protector.",
  DRUID: "Nature's guardian and healer.",
  ASSASSIN: "Silent killer from the shadows.",
  DUELIST: "Elegant swordsman.",
}

function getModalTitle(level: number, jobClass: string | null, jobTier: string): string {
  if (!jobClass) return "Choose Your Job Class"
  if (jobTier === "BASE" && level >= 20) return "Choose Your Advance Class"
  if (jobTier === "ADVANCE" && level >= 50) return "Choose Your Master Class"
  return "Job Class"
}

function getOptions(jobClass: string | null, jobTier: string, advanceClass: string | null): string[] {
  if (!jobClass) return BASE_CLASSES
  if (jobTier === "BASE") return ADVANCE_CLASS_OPTIONS[jobClass] ?? []
  if (jobTier === "ADVANCE" && advanceClass) return MASTER_CLASS_OPTIONS[advanceClass] ?? []
  return []
}

export function JobSelectionModal({
  studentId,
  level,
  jobClass,
  jobTier,
  advanceClass,
  onClose,
  onJobSelected,
}: JobSelectionModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isBaseSelection = !jobClass
  const options = getOptions(jobClass, jobTier, advanceClass)
  const title = getModalTitle(level, jobClass, jobTier)

  async function handleConfirm() {
    if (!selected) return
    setLoading(true)
    setError(null)

    try {
      const endpoint = isBaseSelection
        ? `/api/student/${studentId}/job/select`
        : `/api/student/${studentId}/job/advance`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isBaseSelection ? { jobClass: selected } : { advanceClass: selected }
        ),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to select job class")
      }

      onJobSelected()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-yellow-400">{title}</DialogTitle>
          {jobClass && (
            <p className="text-sm text-slate-400 font-medium">
              เส้นทางปัจจุบัน:{" "}
              <span className="text-slate-200">
                {jobClass}
                {jobTier !== "BASE" && advanceClass
                  ? ` → ${advanceClass}`
                  : ""}
              </span>
              <span className="text-slate-500"> ({jobTier})</span>
            </p>
          )}
        </DialogHeader>

        {error && (
          <div className="bg-red-900/40 border border-red-600 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-2">
          {options.map((cls) => (
            <Card
              key={cls}
              onClick={() => setSelected(cls)}
              className={cn(
                "cursor-pointer p-4 border-2 transition-all bg-slate-800",
                selected === cls
                  ? "border-yellow-400 bg-slate-700"
                  : "border-slate-600 hover:border-slate-400"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{CLASS_ICONS[cls] ?? "⚔️"}</span>
                <div>
                  <div className="font-bold text-white">{cls}</div>
                  {!isBaseSelection && (
                    <Badge variant="outline" className="text-xs border-slate-500 text-slate-400">
                      {jobTier === "BASE" ? "Advance" : "Master"} Class
                    </Badge>
                  )}
                </div>
              </div>
              {CLASS_DESCRIPTIONS[cls] && (
                <p className="text-xs text-slate-400">{CLASS_DESCRIPTIONS[cls]}</p>
              )}
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || loading}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          >
            {loading ? "Selecting..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
