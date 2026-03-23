"use client"

import { BattlePlayer, SoloMonster } from "@/lib/types/game"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SoloFarmingViewProps {
  farmingState: { wave: number; monster: SoloMonster; ap: number; mp: number } | null
  myPlayer: BattlePlayer
  currentQuestion: { id: string; question: string; options: string[]; image?: string } | null
  feedback: { correct: boolean } | null
  attackFeed: string[]
  onAnswer: (index: number) => void
  onSkill: (skillId: string) => void
}

export function SoloFarmingView({
  farmingState,
  myPlayer,
  currentQuestion,
  feedback,
  attackFeed,
  onAnswer,
  onSkill,
}: SoloFarmingViewProps) {
  const monster = farmingState?.monster ?? myPlayer.soloMonster
  const wave = farmingState?.wave ?? myPlayer.wave
  const ap = farmingState?.ap ?? myPlayer.ap
  const mp = farmingState?.mp ?? myPlayer.mp

  const monsterHpPct = monster ? Math.max(0, (monster.hp / monster.maxHp) * 100) : 0
  const apPct = Math.max(0, (ap / myPlayer.maxAp) * 100)
  const mpPct = Math.max(0, (mp / myPlayer.maxMp) * 100)
  const visibleSkills = myPlayer.skills.slice(0, 4)
  const recentFeed = attackFeed.slice(0, 3)

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {/* Top: Wave + Monster HP */}
      <div className="p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Badge className="bg-indigo-600 text-white font-bold px-3 py-1">
            Wave {wave}
          </Badge>
          {monster && (
            <span className="font-bold text-orange-400">{monster.name}</span>
          )}
          {monster && (
            <span className="text-sm text-slate-400 ml-auto">
              {monster.hp}/{monster.maxHp} HP
            </span>
          )}
        </div>
        {monster && (
          <Progress value={monsterHpPct} className="h-3 bg-slate-700 [&>div]:bg-orange-500" />
        )}
      </div>

      {/* Middle: Question or Feedback */}
      <div className="flex-1 flex items-center justify-center p-4">
        {feedback ? (
          <div
            className={cn(
              "text-6xl font-black drop-shadow-lg",
              feedback.correct ? "text-green-400" : "text-red-500"
            )}
          >
            {feedback.correct ? "CORRECT!" : "WRONG!"}
          </div>
        ) : currentQuestion ? (
          <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 p-6">
            {currentQuestion.image && (
              <img
                src={currentQuestion.image}
                alt="question"
                className="w-full max-h-48 object-contain rounded mb-4"
              />
            )}
            <p className="text-white text-xl font-semibold mb-6 text-center">
              {currentQuestion.question}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((opt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="h-14 text-base font-medium bg-slate-700 border-slate-600 text-white hover:bg-indigo-600 hover:border-indigo-500 transition-colors"
                  onClick={() => onAnswer(i)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </Card>
        ) : (
          <div className="text-slate-400 text-xl animate-pulse">Waiting for question...</div>
        )}
      </div>

      {/* Bottom: Feed + Resources + Skills */}
      <div className="bg-slate-800 border-t border-slate-700 p-4 space-y-3">
        {/* Attack feed */}
        {recentFeed.length > 0 && (
          <div className="space-y-1">
            {recentFeed.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "text-xs px-2 py-1 rounded bg-slate-700/60 text-slate-300",
                  i === 0 && "text-green-400 font-semibold"
                )}
              >
                {msg}
              </div>
            ))}
          </div>
        )}

        {/* AP / MP bars */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>AP</span>
              <span>{ap}/{myPlayer.maxAp}</span>
            </div>
            <Progress value={apPct} className="h-2 bg-slate-700 [&>div]:bg-yellow-400" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>MP</span>
              <span>{mp}/{myPlayer.maxMp}</span>
            </div>
            <Progress value={mpPct} className="h-2 bg-slate-700 [&>div]:bg-blue-400" />
          </div>
        </div>

        {/* Skill buttons */}
        {visibleSkills.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {visibleSkills.map((skillId) => (
              <Button
                key={skillId}
                size="sm"
                variant="outline"
                className="border-purple-500 text-purple-300 hover:bg-purple-900/40"
                onClick={() => onSkill(skillId)}
              >
                ✨ {skillId}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
