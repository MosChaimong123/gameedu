"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MATERIAL_TYPES } from "@/lib/game/crafting-system"

interface MaterialInventoryProps {
  materials: { type: string; quantity: number }[]
}

type MaterialTier = "COMMON" | "RARE" | "EPIC" | "LEGENDARY"

const MATERIAL_TIER_MAP: Record<string, MaterialTier> = {
  "Stone Fragment": "COMMON",
  "Wolf Fang": "COMMON",
  "Iron Ore": "COMMON",
  "Forest Herb": "COMMON",
  "Dragon Scale": "RARE",
  "Shadow Essence": "RARE",
  "Thunder Crystal": "RARE",
  "Void Shard": "RARE",
  "Phoenix Feather": "EPIC",
  "Abyssal Core": "EPIC",
  "Celestial Dust": "EPIC",
  "Ancient Relic": "LEGENDARY",
}

const MATERIAL_ICONS: Record<string, string> = {
  "Stone Fragment": "🪨",
  "Wolf Fang": "🐺",
  "Iron Ore": "⛏️",
  "Forest Herb": "🌿",
  "Dragon Scale": "🐉",
  "Shadow Essence": "🌑",
  "Thunder Crystal": "⚡",
  "Void Shard": "🌀",
  "Phoenix Feather": "🔥",
  "Abyssal Core": "💀",
  "Celestial Dust": "✨",
  "Ancient Relic": "🏺",
}

const TIER_STYLES: Record<MaterialTier, { header: string; badge: string; card: string; qty: string }> = {
  COMMON: {
    header: "text-slate-300",
    badge: "bg-slate-600 text-slate-200",
    card: "bg-slate-800 border-slate-600",
    qty: "text-slate-300",
  },
  RARE: {
    header: "text-blue-300",
    badge: "bg-blue-700 text-blue-100",
    card: "bg-slate-800 border-blue-700/50",
    qty: "text-blue-300",
  },
  EPIC: {
    header: "text-purple-300",
    badge: "bg-purple-700 text-purple-100",
    card: "bg-slate-800 border-purple-700/50",
    qty: "text-purple-300",
  },
  LEGENDARY: {
    header: "text-yellow-300",
    badge: "bg-yellow-600 text-yellow-100",
    card: "bg-slate-800 border-yellow-600/50",
    qty: "text-yellow-300",
  },
}

const TIER_ORDER: MaterialTier[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"]

const TIER_GROUPS: Record<MaterialTier, string[]> = {
  COMMON: ["Stone Fragment", "Wolf Fang", "Iron Ore", "Forest Herb"],
  RARE: ["Dragon Scale", "Shadow Essence", "Thunder Crystal", "Void Shard"],
  EPIC: ["Phoenix Feather", "Abyssal Core", "Celestial Dust"],
  LEGENDARY: ["Ancient Relic"],
}

export function MaterialInventory({ materials }: MaterialInventoryProps) {
  const matMap = new Map(materials.map((m) => [m.type, m.quantity]))

  return (
    <div className="space-y-4">
      {TIER_ORDER.map((tier) => {
        const tierStyle = TIER_STYLES[tier]
        const tierMaterials = TIER_GROUPS[tier]

        return (
          <div key={tier}>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={tierStyle.badge}>{tier}</Badge>
              <span className={cn("text-xs font-semibold", tierStyle.header)}>
                Materials ({tierMaterials.length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tierMaterials.map((mat) => {
                const qty = matMap.get(mat) ?? 0
                const hasAny = qty > 0

                return (
                  <Card
                    key={mat}
                    className={cn(
                      "border p-3 transition-opacity",
                      tierStyle.card,
                      !hasAny && "opacity-50"
                    )}
                  >
                    <div className="flex flex-col items-center text-center gap-1">
                      <span className="text-2xl">{MATERIAL_ICONS[mat] ?? "📦"}</span>
                      <span className="text-xs text-slate-300 leading-tight">{mat}</span>
                      <span className={cn("text-lg font-bold", hasAny ? tierStyle.qty : "text-slate-500")}>
                        {qty}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
