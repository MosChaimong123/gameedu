"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { BossRaidView } from "@/components/battle/BossRaidView"
import { BattleAudioToggle } from "@/components/battle/BattleAudioToggle"
import { BattleAccessibilityToggle } from "@/components/battle/BattleAccessibilityToggle"
import { SoloFarmingView } from "@/components/battle/SoloFarmingView"
import { ResultScreen } from "@/components/battle/ResultScreen"
import { useBattleSound } from "@/components/battle/use-battle-sound"
import { useAccessibility } from "@/components/providers/accessibility-provider"
import { useSocket } from "@/components/providers/socket-provider"
import { createBattleEvent, type BattleAnimationEvent, type BattleRuntimeEventPayload } from "@/lib/game/battle-events"
import { BattlePhase, BattlePlayer, BossState, FinalReward, SoloMonster } from "@/lib/types/game"

type CurrentQuestion = {
  id: string
  question: string
  options: string[]
  image?: string
}

type FarmingState = {
  wave: number
  monster: SoloMonster
  ap: number
  stamina?: number
  maxStamina?: number
  mp: number
}

export default function BattlePage() {
  const params = useParams()
  const pin = params.pin as string
  const { socket } = useSocket()
  const {
    reducedMotion,
    reducedSound,
    toggleReducedMotion,
    toggleReducedSound,
  } = useAccessibility()

  const [battlePhase, setBattlePhase] = useState<BattlePhase>("LOBBY")
  const [players, setPlayers] = useState<BattlePlayer[]>([])
  const [boss, setBoss] = useState<BossState | null>(null)
  const [myPlayer, setMyPlayer] = useState<BattlePlayer | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)
  const [farmingState, setFarmingState] = useState<FarmingState | null>(null)
  const [finalRewards, setFinalRewards] = useState<FinalReward[]>([])
  const [attackFeed, setAttackFeed] = useState<string[]>([])
  const [battleEvents, setBattleEvents] = useState<BattleAnimationEvent[]>([])
  const [myStudentId] = useState(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem("student_id") ?? ""
  )

  useBattleSound(battleEvents, reducedSound)

  const feedbackTimer = useRef<NodeJS.Timeout | null>(null)

  const pushBattleEvent = (event: Omit<BattleAnimationEvent, "id" | "timestamp">) => {
    setBattleEvents((prev) => [...prev.slice(-29), createBattleEvent(event)])
  }

  useEffect(() => {
    if (!socket || !pin) return

    const name = sessionStorage.getItem("player_name") ?? "Player"
    socket.emit("join-game", { pin, nickname: name })

    socket.on("battle-state", (data: { phase: BattlePhase; players: BattlePlayer[]; boss: BossState | null }) => {
      setBattlePhase(data.phase)
      setPlayers(data.players)
      setBoss(data.boss)
      const me = data.players.find((p) => p.id === socket.id) ?? null
      setMyPlayer(me)
    })

    socket.on("battle-event", (event: BattleRuntimeEventPayload) => {
      pushBattleEvent(event)
    })

    socket.on("player-damaged", (data: { playerId: string; damage: number; remainingHp: number }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.playerId ? { ...p, hp: data.remainingHp } : p))
      )
      setMyPlayer((prev) =>
        prev && prev.id === data.playerId ? { ...prev, hp: data.remainingHp } : prev
      )
    })

    socket.on("boss-damaged", (data: { currentHp: number; maxHp: number }) => {
      setBoss((prev) => (prev ? { ...prev, hp: data.currentHp, maxHp: data.maxHp } : prev))
    })

    socket.on("boss-defeated", () => {
      // battle-state will follow with phase transition
    })

    socket.on("farming-state", (data: FarmingState) => {
      setFarmingState(data)
      setMyPlayer((prev) =>
        prev
          ? {
              ...prev,
              ap: data.ap,
              stamina: data.stamina ?? data.ap,
              maxStamina: data.maxStamina ?? prev.maxStamina ?? prev.maxAp,
              mp: data.mp,
            }
          : prev
      )
    })

    socket.on("monster-defeated", (data: { loot: { gold: number; xp: number }; nextWave: number }) => {
      const msg = `Monster defeated! +${data.loot.gold} gold, +${data.loot.xp} XP`
      pushBattleEvent({
        type: "UNIT_DEFEATED",
        targetId: "solo-monster",
        label: `กำจัดศัตรูสำเร็จ +${data.loot.gold} Gold / +${data.loot.xp} XP`,
        tone: "success",
      })
      setAttackFeed((prev) => [msg, ...prev].slice(0, 10))
    })

    socket.on("next-wave", (data: { wave: number; monster: SoloMonster }) => {
      const msg = `Wave ${data.wave}: ${data.monster.name} appeared!`
      pushBattleEvent({
        type: "BANNER",
        label: `Wave ${data.wave}: ${data.monster.name}`,
        tone: "warning",
      })
      setAttackFeed((prev) => [msg, ...prev].slice(0, 10))
    })

    socket.on("battle-ended", (data: { players: FinalReward[] }) => {
      setFinalRewards(data.players)
      setBattlePhase("RESULT")
    })

    socket.on("next-question", (q: CurrentQuestion) => {
      setCurrentQuestion(q)
      setFeedback(null)
      pushBattleEvent({
        type: "QUESTION_START",
        label: q.question,
      })
    })

    socket.on("answer-result", (data: { correct: boolean; apGain?: number; staminaGain?: number }) => {
      setFeedback(data)
      pushBattleEvent({
        type: "ANSWER_RESULT",
        correct: data.correct,
      })

      const staminaGain = data.staminaGain ?? data.apGain ?? 0
      if (staminaGain > 0) {
        pushBattleEvent({
          type: "RESOURCE_GAINED",
          targetId: socket.id,
          amount: staminaGain,
          resourceType: "STAMINA",
        })
      }

      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => {
        setFeedback(null)
        // In CO_OP_BOSS_RAID, request next question after correct answer
        if (data.correct) {
          socket.emit("request-question", { pin })
        } else {
          socket.emit("request-question", { pin })
        }
      }, 1500)
    })

    socket.on("error", (data: { message: string }) => {
      console.error("[BattlePage] Socket error:", data.message)
    })

    // Request initial question
    socket.emit("request-question", { pin })

    return () => {
      socket.off("battle-state")
      socket.off("battle-event")
      socket.off("player-damaged")
      socket.off("boss-damaged")
      socket.off("boss-defeated")
      socket.off("farming-state")
      socket.off("monster-defeated")
      socket.off("next-wave")
      socket.off("battle-ended")
      socket.off("next-question")
      socket.off("answer-result")
      socket.off("error")
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    }
  }, [pin, socket])

  const handleAnswer = (index: number) => {
    if (!socket || !currentQuestion) return
    socket.emit("submit-answer", { pin, questionId: currentQuestion.id, answerIndex: index })
  }

  const handleBossAction = (type: "ATTACK" | "DEFEND" | "SKILL", skillId?: string) => {
    if (!socket) return
    socket.emit("battle-action", { pin, type, skillId, targetId: "boss" })
  }

  const handleFarmingSkill = (skillId: string) => {
    if (!socket) return
    socket.emit("farming-action", { pin, type: "SKILL", skillId })
  }

  // Loading / Lobby / Prep
  if (battlePhase === "LOBBY" || battlePhase === "PREP") {
    return (
      <>
        <BattleAudioToggle />
        <BattleAccessibilityToggle
          reducedMotion={reducedMotion}
          reducedSound={reducedSound}
          onToggleReducedMotion={toggleReducedMotion}
          onToggleReducedSound={toggleReducedSound}
        />
        <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
          <div className="text-4xl font-bold mb-4 animate-pulse">
            {battlePhase === "LOBBY" ? "Waiting for battle to start..." : "Preparing battle..."}
          </div>
          <div className="text-slate-400 text-lg">PIN: {pin}</div>
          <div className="mt-6 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </>
    )
  }

  if (battlePhase === "RESULT") {
    return (
      <>
        <BattleAudioToggle />
        <BattleAccessibilityToggle
          reducedMotion={reducedMotion}
          reducedSound={reducedSound}
          onToggleReducedMotion={toggleReducedMotion}
          onToggleReducedSound={toggleReducedSound}
        />
        <ResultScreen
          rewards={finalRewards}
          myStudentId={myStudentId}
        />
      </>
    )
  }

  if (battlePhase === "CO_OP_BOSS_RAID" && boss && myPlayer) {
    return (
      <>
        <BattleAudioToggle />
        <BattleAccessibilityToggle
          reducedMotion={reducedMotion}
          reducedSound={reducedSound}
          onToggleReducedMotion={toggleReducedMotion}
          onToggleReducedSound={toggleReducedSound}
        />
        <BossRaidView
          boss={boss}
          players={players}
          myPlayer={myPlayer}
          currentQuestion={currentQuestion}
          feedback={feedback}
          battleEvents={battleEvents}
          reducedMotion={reducedMotion}
          onAnswer={handleAnswer}
          onAction={handleBossAction}
        />
      </>
    )
  }

  if (battlePhase === "SOLO_FARMING" && myPlayer) {
    return (
      <>
        <BattleAudioToggle />
        <BattleAccessibilityToggle
          reducedMotion={reducedMotion}
          reducedSound={reducedSound}
          onToggleReducedMotion={toggleReducedMotion}
          onToggleReducedSound={toggleReducedSound}
        />
        <SoloFarmingView
          farmingState={farmingState}
          myPlayer={myPlayer}
          currentQuestion={currentQuestion}
          feedback={feedback}
          attackFeed={attackFeed}
          battleEvents={battleEvents}
          reducedMotion={reducedMotion}
          onAnswer={handleAnswer}
          onSkill={handleFarmingSkill}
        />
      </>
    )
  }

  // Fallback
  return (
    <>
      <BattleAudioToggle />
      <BattleAccessibilityToggle
        reducedMotion={reducedMotion}
        reducedSound={reducedSound}
        onToggleReducedMotion={toggleReducedMotion}
        onToggleReducedSound={toggleReducedSound}
      />
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-2xl animate-pulse">Loading battle...</div>
      </div>
    </>
  )
}
