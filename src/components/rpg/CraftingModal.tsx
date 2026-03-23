"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CRAFT_REQUIREMENTS } from "@/lib/game/crafting-system"

interface CraftingModalProps {
  studentId: string
  materials: { type: string; quantity: number }[]
  onClose: () => void
  onCrafted: () => void
}

type CraftResult = { itemName: string; tier: string } | null

const TIER_STYLES: Record<string, { border: string; badge: string; text: string }> = {
  COMMON: {
    border: "border-slate-600",
    badge: "bg-slate-600 text-slate-200",
    text: "text-slate-300",
  },
  RARE: {
    border: "border-blue-600",
    badge: "bg-blue-700 text-blue-100",
    text: "text-blue-300",
  },
  EPIC: {
    border: "border-purple-600",
    badge: "bg-purple-700 text-purple-100",
    text: "text-purple-300",
  },
  LEGENDARY: {
    border: "border-yellow-500",
    badge: "bg-yellow-600 text-yellow-100",
    text: "text-yellow-300",
  },
}

const TIER_ORDER = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const

export function CraftingModal({ studentId, materials, onClose, onCrafted }: CraftingModalProps) {
  const [loading, setLoading] = useState<string | null>(null) // materialType being crafted
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CraftResult>(null)

  const matMap = new Map(materials.map((m) => [m.type, m.quantity]))

  async function handleCraft(materialType: string, targetTier: string) {
    setLoading(materialType)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/student/${studentId}/craft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialType, targetTier }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Crafting failed")
      }

      setResult({ itemName: data.itemName, tier: targetTier })
      onCrafted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Crafting</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-900/40 border border-red-600 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-900/40 border border-green-600 rounded p-3 text-center">
            <p className="text-green-400 font-bold text-lg">✨ Crafted!</p>
            <p className="text-white">{result.itemName}</p>
            <Badge className={TIER_STYLES[result.tier]?.badge ?? ""}>{result.tier}</Badge>
          </div>
        )}

        <div className="space-y-4">
          {TIER_ORDER.map((tier) => {
            const req = CRAFT_REQUIREMENTS[tier]
            if (!req) return null
            const tierStyle = TIER_STYLES[tier]

            return (
              <div key={tier} className={cn("rounded-lg border p-3", tierStyle.border, "bg-slate-800")}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={tierStyle.badge}>{tier}</Badge>
                  <span className="text-xs text-slate-400">
                    Requires {req.quantity}× material
                  </span>
                </div>

                <div className="space-y-2">
                  {req.materials.map((mat) => {
                    const owned = matMap.get(mat) ?? 0
                    const canCraft = owned >= req.quantity
                    const isLoading = loading === mat

                    return (
                      <div
                        key={mat}
                        className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className={cn("text-sm font-medium", tierStyle.text)}>{mat}</div>
                            <div className="text-xs text-slate-400">
                              Need {req.quantity} ·{" "}
                              <span className={canCraft ? "text-green-400" : "text-red-400"}>
                                Have {owned}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={!canCraft || isLoading || loading !== null}
                          onClick={() => handleCraft(mat, tier)}
                          className={cn(
                            "text-xs font-bold",
                            canCraft
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                              : "bg-slate-600 text-slate-400 cursor-not-allowed"
                          )}
                        >
                          {isLoading ? "Crafting..." : "Craft"}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end mt-2">
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
