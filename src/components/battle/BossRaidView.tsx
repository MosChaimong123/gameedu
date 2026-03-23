"use client"

import { BattlePlayer, BossState } from "@/lib/types/game"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface BossRaidViewProps {
  boss: BossState
  players: BattlePlayer[]
  myPlayer: BattlePlayer
  currentQuestion: { id: string; question: string; options: string[]; image?: string } | null
  feedback: { correct: boolean } | null
  onAnswer: (index: number) => void
  onAction: (type: "ATTACK" | "DEFEND" | "SKILL", skillId?: string) => void
}

export function BossRaidView({
  boss,
  players,
  myPlayer,
  currentQuestion,
  feedback,
  onAnswer,
  onAction,
}: BossRaidViewProps) {
  const bossHpPct = Math.max(0, (boss.hp / boss.maxHp) * 100)
  const myApPct = Math.max(0, (myPlayer.ap / myPlayer.maxAp) * 100)
  const visibleSkills = myPlayer.skills.slice(0, 3)

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {/* Top: Boss HP */}
      <div className="p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-red-400 text-lg">{boss.name}</span>
          <span className="text-sm text-slate-300">
            {boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()} HP
          </span>
        </div>
        <Progress value={bossHpPct} className="h-4 bg-slate-700 [&>div]:bg-red-500" />
      </div>

      {/* Middle: Question or Feedback */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
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

      {/* Bottom: Players + Actions */}
      <div className="bg-slate-800 border-t border-slate-700 p-4 space-y-3">
        {/* Players HP row */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {players.map((p) => {
            const isMe = p.id === myPlayer.id
            const hpPct = Math.max(0, (p.hp / p.maxHp) * 100)
            return (
              <div
                key={p.id}
                className={cn(
                  "flex-shrink-0 w-28 rounded-lg p-2 border",
                  isMe
                    ? "bg-indigo-900/60 border-indigo-500"
                    : "bg-slate-700/60 border-slate-600"
                )}
              >
                <div className="text-xs font-semibold truncate mb-1">
                  {isMe ? "You" : p.name}
                </div>
                <Progress value={hpPct} className="h-2 bg-slate-600 [&>div]:bg-green-500" />
                <div className="text-xs text-slate-400 mt-1">
                  {p.hp}/{p.maxHp}
                </div>
              </div>
            )
          })}
        </div>

        {/* My AP bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>AP</span>
            <span>{myPlayer.ap}/{myPlayer.maxAp}</span>
          </div>
          <Progress value={myApPct} className="h-2 bg-slate-700 [&>div]:bg-yellow-400" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-500 text-white font-bold"
            disabled={myPlayer.ap < 10}
            onClick={() => onAction("ATTACK")}
          >
            ⚔️ Attack (10 AP)
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-900/40"
            onClick={() => onAction("DEFEND")}
          >
            🛡️ Defend
          </Button>
          {visibleSkills.map((skillId) => (
            <Button
              key={skillId}
              size="sm"
              variant="outline"
              className="border-purple-500 text-purple-300 hover:bg-purple-900/40"
              onClick={() => onAction("SKILL", skillId)}
            >
              ✨ {skillId}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
