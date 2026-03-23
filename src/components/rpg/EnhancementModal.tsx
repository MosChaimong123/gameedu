"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  getEnhancementZone,
  getSuccessRate,
  calculateEnhancementCost,
  TIER_MAX,
} from "@/lib/game/enhancement-system"

interface StudentItemProp {
  id: string
  name: string
  tier: string
  enhancementLevel: number
}

interface EnhancementModalProps {
  studentItem: StudentItemProp
  studentGold: number
  studentBp: number
  materials: { type: string; quantity: number }[]
  onClose: () => void
  onEnhanced: () => void
}

type ResultState = { success: boolean; newLevel: number } | null

const ZONE_STYLES = {
  SAFE: {
    label: "Safe Zone",
    color: "text-green-400",
    bg: "bg-green-900/30 border-green-700",
    badge: "bg-green-700 text-green-100",
  },
  RISK: {
    label: "Risk Zone",
    color: "text-yellow-400",
    bg: "bg-yellow-900/30 border-yellow-700",
    badge: "bg-yellow-700 text-yellow-100",
  },
  DANGER: {
    label: "Danger Zone",
    color: "text-red-400",
    bg: "bg-red-900/30 border-red-700",
    badge: "bg-red-700 text-red-100",
  },
}

const TIER_COLORS: Record<string, string> = {
  COMMON: "text-slate-300",
  RARE: "text-blue-300",
  EPIC: "text-purple-300",
  LEGENDARY: "text-yellow-300",
}

export function EnhancementModal({
  studentItem,
  studentGold,
  studentBp,
  materials,
  onClose,
  onEnhanced,
}: EnhancementModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultState>(null)

  const currentLevel = studentItem.enhancementLevel
  const tierMax = TIER_MAX[studentItem.tier] ?? 9
  const atMax = currentLevel >= tierMax

  const zone = getEnhancementZone(currentLevel)
  const successRate = getSuccessRate(currentLevel)
  const zoneStyle = ZONE_STYLES[zone]

  // Find a suitable material for Danger zone
  const dangerMaterial = materials.find((m) => m.quantity > 0)
  const cost = calculateEnhancementCost(currentLevel, 100, dangerMaterial?.type)

  const hasSufficientGold = studentGold >= cost.gold
  const hasSufficientBp = studentBp >= cost.behaviorPoints
  const hasSufficientMaterial =
    zone !== "DANGER" ||
    (dangerMaterial && dangerMaterial.quantity >= cost.materialQuantity)

  const canEnhance = !atMax && hasSufficientGold && hasSufficientBp && hasSufficientMaterial

  async function handleEnhance() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/student/inventory/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentItemId: studentItem.id,
          materialType: dangerMaterial?.type,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Enhancement failed")
      }

      setResult({ success: data.success, newLevel: data.newLevel })
      if (data.success) {
        onEnhanced()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Enhance Equipment</DialogTitle>
        </DialogHeader>

        {/* Item Info */}
        <div className="bg-slate-800 rounded-lg p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className={cn("font-bold text-lg", TIER_COLORS[studentItem.tier])}>
              {studentItem.name}
            </span>
            <Badge className="bg-slate-700 text-slate-300 text-xs">{studentItem.tier}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">Current:</span>
            <span className="text-yellow-400 font-bold">+{currentLevel}</span>
            {!atMax && (
              <>
                <span className="text-slate-500">→</span>
                <span className="text-green-400 font-bold">+{currentLevel + 1}</span>
              </>
            )}
            <span className="text-slate-500 text-xs ml-auto">Max: +{tierMax}</span>
          </div>
        </div>

        {atMax ? (
          <div className="bg-slate-700/50 rounded-lg p-4 text-center text-slate-400">
            This item is at maximum enhancement level (+{tierMax}).
          </div>
        ) : (
          <>
            {/* Zone Indicator */}
            <div className={cn("rounded-lg border p-3", zoneStyle.bg)}>
              <div className="flex items-center justify-between mb-1">
                <span className={cn("font-bold", zoneStyle.color)}>{zoneStyle.label}</span>
                <Badge className={zoneStyle.badge}>{Math.round(successRate)}% Success</Badge>
              </div>
              <p className="text-xs text-slate-400">
                {zone === "SAFE" && "Guaranteed success. No risk of failure."}
                {zone === "RISK" && "May fail. Enhancement level unchanged on failure."}
                {zone === "DANGER" && "High risk! Enhancement level decreases by 1 on failure."}
              </p>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-slate-800 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cost
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gold</span>
                  <span className={hasSufficientGold ? "text-yellow-400" : "text-red-400"}>
                    {cost.gold.toLocaleString()} / {studentGold.toLocaleString()}
                  </span>
                </div>
                {cost.behaviorPoints > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Behavior Points</span>
                    <span className={hasSufficientBp ? "text-blue-400" : "text-red-400"}>
                      {cost.behaviorPoints} / {studentBp}
                    </span>
                  </div>
                )}
                {zone === "DANGER" && cost.materialQuantity > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Material</span>
                    <span className={hasSufficientMaterial ? "text-green-400" : "text-red-400"}>
                      {cost.materialQuantity}× {dangerMaterial?.type ?? "None available"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div
                className={cn(
                  "rounded-lg p-3 text-center font-bold text-lg",
                  result.success
                    ? "bg-green-900/40 border border-green-600 text-green-400"
                    : "bg-red-900/40 border border-red-600 text-red-400"
                )}
              >
                {result.success
                  ? `✨ Success! Now +${result.newLevel}`
                  : zone === "DANGER"
                  ? `💥 Failed! Dropped to +${result.newLevel}`
                  : "💨 Failed! Level unchanged."}
              </div>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-600 rounded p-3 text-red-300 text-sm">
                {error}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            {result ? "Close" : "Cancel"}
          </Button>
          {!atMax && !result && (
            <Button
              onClick={handleEnhance}
              disabled={!canEnhance || loading}
              className={cn(
                "font-bold",
                zone === "SAFE" && "bg-green-600 hover:bg-green-500 text-white",
                zone === "RISK" && "bg-yellow-500 hover:bg-yellow-400 text-black",
                zone === "DANGER" && "bg-red-600 hover:bg-red-500 text-white"
              )}
            >
              {loading ? "Enhancing..." : `Enhance (+${currentLevel} → +${currentLevel + 1})`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
