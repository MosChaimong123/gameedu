"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface EquippedItem {
  slot: string
  item: {
    id: string
    name: string
    tier: string
    setId?: string
    enhancementLevel: number
  } | null
}

interface EquipmentSlotsProps {
  equippedItems: EquippedItem[]
  onSlotClick?: (slot: string) => void
}

const SLOTS = ["HEAD", "BODY", "WEAPON", "OFFHAND", "GLOVES", "BOOTS", "ACCESSORY"] as const

const SLOT_ICONS: Record<string, string> = {
  HEAD: "🪖",
  BODY: "🥋",
  WEAPON: "⚔️",
  OFFHAND: "🛡️",
  GLOVES: "🧤",
  BOOTS: "👢",
  ACCESSORY: "💍",
}

const TIER_STYLES: Record<string, { border: string; text: string; badge: string }> = {
  COMMON: {
    border: "border-slate-500",
    text: "text-slate-300",
    badge: "bg-slate-600 text-slate-200",
  },
  RARE: {
    border: "border-blue-500",
    text: "text-blue-300",
    badge: "bg-blue-700 text-blue-100",
  },
  EPIC: {
    border: "border-purple-500",
    text: "text-purple-300",
    badge: "bg-purple-700 text-purple-100",
  },
  LEGENDARY: {
    border: "border-yellow-500",
    text: "text-yellow-300",
    badge: "bg-yellow-600 text-yellow-100",
  },
}

// Set bonus definitions
const SET_BONUSES: Record<string, { name: string; bonuses: { pieces: number; description: string }[] }> = {
  dragon_set: {
    name: "Dragon Set",
    bonuses: [
      { pieces: 2, description: "ATK+15%, DEF+15%" },
      { pieces: 4, description: "Boss DMG+30%, HP+500" },
    ],
  },
  thunder_set: {
    name: "Thunder Set",
    bonuses: [
      { pieces: 2, description: "SPD+20%, CRIT+8%" },
      { pieces: 4, description: "Chain Lightning on CRIT" },
    ],
  },
  shadow_set: {
    name: "Shadow Set",
    bonuses: [
      { pieces: 2, description: "LUCK+10%, Gold+20%" },
      { pieces: 4, description: "15% Dodge, Steal Gold+50%" },
    ],
  },
  legendary_set: {
    name: "Legendary Set",
    bonuses: [
      { pieces: 7, description: "All Stats+25%, XP×1.5, 'Chosen One'" },
    ],
  },
}

function detectActiveBonuses(equippedItems: EquippedItem[]) {
  // Count items per setId
  const setCounts: Record<string, number> = {}
  for (const ei of equippedItems) {
    if (ei.item?.setId) {
      setCounts[ei.item.setId] = (setCounts[ei.item.setId] ?? 0) + 1
    }
  }

  const active: { setId: string; name: string; pieces: number; description: string }[] = []
  for (const [setId, count] of Object.entries(setCounts)) {
    const setDef = SET_BONUSES[setId]
    if (!setDef) continue
    for (const bonus of setDef.bonuses) {
      if (count >= bonus.pieces) {
        active.push({ setId, name: setDef.name, pieces: bonus.pieces, description: bonus.description })
      }
    }
  }
  return active
}

export function EquipmentSlots({ equippedItems, onSlotClick }: EquipmentSlotsProps) {
  const slotMap = new Map(equippedItems.map((ei) => [ei.slot, ei]))
  const activeBonuses = detectActiveBonuses(equippedItems)

  return (
    <div className="space-y-3">
      {/* Equipment Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {SLOTS.map((slot) => {
          const equipped = slotMap.get(slot)
          const item = equipped?.item ?? null
          const tierStyle = item ? (TIER_STYLES[item.tier] ?? TIER_STYLES.COMMON) : null

          return (
            <div
              key={slot}
              onClick={() => onSlotClick?.(slot)}
              className={cn(
                "rounded-lg border-2 p-3 transition-all",
                onSlotClick ? "cursor-pointer hover:bg-slate-700/60" : "",
                item && tierStyle ? tierStyle.border : "border-slate-600",
                "bg-slate-800"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{SLOT_ICONS[slot]}</span>
                <span className="text-xs text-slate-400 font-medium">{slot}</span>
              </div>
              {item ? (
                <div>
                  <div className={cn("text-sm font-semibold truncate", tierStyle?.text)}>
                    {item.name}
                    {item.enhancementLevel > 0 && (
                      <span className="text-yellow-400 ml-1">+{item.enhancementLevel}</span>
                    )}
                  </div>
                  <Badge className={cn("text-xs mt-1 px-1 py-0", tierStyle?.badge)}>
                    {item.tier}
                  </Badge>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">Empty</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Set Bonuses */}
      {activeBonuses.length > 0 && (
        <Card className="bg-slate-800 border-slate-700 p-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active Set Bonuses
          </h4>
          <div className="space-y-1">
            {activeBonuses.map((bonus, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge className="bg-yellow-600/30 text-yellow-300 border border-yellow-600/50 text-xs">
                  {bonus.name} {bonus.pieces}pc
                </Badge>
                <span className="text-slate-300 text-xs">{bonus.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
