"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { JOB_CLASSES } from "@/lib/game/job-system"

interface JobClassCardProps {
  jobClass: string
  jobTier: string
  advanceClass?: string | null
  jobSkills?: string[]
}

const TIER_COLORS: Record<string, string> = {
  BASE: "text-blue-400 border-blue-500",
  ADVANCE: "text-purple-400 border-purple-500",
  MASTER: "text-yellow-400 border-yellow-500",
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "SPD",
  mag: "MAG",
  mp: "MP",
  crit: "CRIT",
}

function formatMultiplier(val: number): string {
  if (val === 1.0) return "×1.0"
  return `×${val.toFixed(1)}`
}

function multiplierColor(val: number): string {
  if (val > 1.0) return "text-green-400"
  if (val < 1.0) return "text-red-400"
  return "text-slate-400"
}

export function JobClassCard({ jobClass, jobTier, advanceClass, jobSkills = [] }: JobClassCardProps) {
  const classDef = JOB_CLASSES[jobClass?.toUpperCase()]
  if (!classDef) return null

  const unlockedSet = new Set(jobSkills)
  const tierColor = TIER_COLORS[jobTier] ?? TIER_COLORS.BASE

  // Apply advance/master tier bonus (×1.2 on primary stats)
  const tierMultiplier = jobTier === "BASE" ? 1.0 : 1.2
  const mults = classDef.statMultipliers

  return (
    <Card className="bg-slate-800 border-slate-700 text-white p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{jobClass}</h3>
          {advanceClass && (
            <p className="text-sm text-slate-400">{advanceClass}</p>
          )}
        </div>
        <Badge variant="outline" className={cn("text-xs", tierColor)}>
          {jobTier}
        </Badge>
      </div>

      {/* Stat Multipliers */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Stat Multipliers
        </h4>
        <div className="grid grid-cols-4 gap-1">
          {Object.entries(mults).map(([stat, val]) => {
            const effective = stat === "hp" || stat === "atk" || stat === "def" || stat === "spd" || stat === "mag" || stat === "mp" || stat === "crit"
              ? (jobTier !== "BASE" && val !== 1.0 ? val * tierMultiplier : val)
              : val
            return (
              <div key={stat} className="bg-slate-700/60 rounded p-1.5 text-center">
                <div className="text-xs text-slate-400">{STAT_LABELS[stat]}</div>
                <div className={cn("text-xs font-bold", multiplierColor(effective))}>
                  {formatMultiplier(effective)}
                </div>
              </div>
            )
          })}
        </div>
        {jobTier !== "BASE" && (
          <p className="text-xs text-purple-400 mt-1">+×1.2 bonus applied to primary stats</p>
        )}
      </div>

      {/* Skills */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Skills
        </h4>
        <div className="space-y-1">
          {classDef.skills.map((skill) => {
            const unlocked = unlockedSet.has(skill.id)
            return (
              <div
                key={skill.id}
                className={cn(
                  "flex items-center justify-between rounded px-2 py-1.5 text-sm",
                  unlocked ? "bg-indigo-900/40 border border-indigo-700/50" : "bg-slate-700/30 opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs", unlocked ? "text-green-400" : "text-slate-500")}>
                    {unlocked ? "✓" : "🔒"}
                  </span>
                  <span className={unlocked ? "text-white" : "text-slate-500"}>{skill.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Lv{skill.unlockLevel}</span>
                  <span className={skill.costType === "MP" ? "text-blue-400" : "text-yellow-400"}>
                    {skill.cost}{skill.costType}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Passives */}
      {classDef.passives.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Passive Bonuses
          </h4>
          <div className="space-y-1">
            {classDef.passives.map((passive) => (
              <div key={passive.id} className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">◆</span>
                <div>
                  <span className="text-white font-medium">{passive.name}</span>
                  <span className="text-slate-400 ml-2 text-xs">{passive.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
