"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSocket } from "@/components/providers/socket-provider"
import { QuestionCard } from "@/components/game/gold-quest/question-card"
import { GameHeader } from "@/components/game/gold-quest/game-header"
import { InteractionNotification } from "@/components/game/gold-quest/interaction-notification"
import type { CryptoHackPlayer, CryptoReward, GameSettings, GoldQuestPlayer, HackTask } from "@/lib/types/game"
import { GoldQuestClient } from "@/components/game/gold-quest/gold-quest-client"
import { CryptoHackClient } from "@/components/game/crypto-hack/crypto-hack-client"
import { TaskOverlay } from "@/components/game/crypto-hack/task-overlay"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { clearPlayerSession, getPlayerSession } from "@/lib/player-session"
import { useSound } from "@/hooks/use-sound"
import { SoundController } from "@/components/game/sound-controller"
import { motion } from "framer-motion"
import {
    createInitialPlayer,
    isCryptoHackPlayer,
    isNegamonBattlePlayer,
    toGoldQuestPlayer,
    type GameView,
    type PlayerMode,
    type PlayerState,
    type QuestionPayload,
} from "./play-game-types"
import { NegamonBattleTopBar, NegamonBetweenRoundsView, NegamonQuestionHint } from "./negamon-play-ui"
import type { NegamonBetweenRoundPlayback } from "./negamon-play-ui"
import { usePlayGameSocket } from "./use-play-game-socket"
import { useLanguage } from "@/components/providers/language-provider"

export default function PlayerGamePage() {
    const router = useRouter()
    const { socket } = useSocket()
    const { toast } = useToast()
    const { t } = useLanguage()
    const { play, stopBGM } = useSound()
    const initialPlayerSession = getPlayerSession()

    const [view, setView] = useState<GameView>("QUESTION")
    const [gameMode, setGameMode] = useState<PlayerMode>("GOLD_QUEST")
    const gameModeRef = useRef<PlayerMode>("GOLD_QUEST")

    const [player, setPlayer] = useState<PlayerState>(createInitialPlayer(initialPlayerSession?.name ?? "Player"))

    const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null)
    const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)

    const [otherPlayers, setOtherPlayers] = useState<PlayerState[]>([])
    const [notification, setNotification] = useState<{
        message: string
        type: "SWAP" | "STEAL" | "generic"
    } | null>(null)

    const [endTime, setEndTime] = useState<number | null>(null)
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)
    const [currentTask, setCurrentTask] = useState<HackTask | null>(null)
    const [passwordOptions, setPasswordOptions] = useState<string[]>([])
    const [hackHint, setHackHint] = useState<string | null>(null)
    const [boxReveal, setBoxReveal] = useState<{ index: number; reward: CryptoReward } | null>(null)
    const [hackResult, setHackResult] = useState<{
        success: boolean
        amount?: number
        targetName: string
    } | null>(null)
    const [lockedNegamonChoice, setLockedNegamonChoice] = useState<number | null>(null)
    const [negamonBetweenPlayback, setNegamonBetweenPlayback] = useState<NegamonBetweenRoundPlayback | null>(null)

    const navigationTimer = useRef<NodeJS.Timeout | null>(null)
    const hasRequestedFirstQuestion = useRef(false)

    usePlayGameSocket({
        socket,
        router,
        toast,
        play,
        stopBGM,
        gameModeRef,
        navigationTimer,
        hasRequestedFirstQuestion,
        setView,
        setGameMode,
        setPlayer,
        setCurrentQuestion,
        setFeedback,
        setOtherPlayers,
        setNotification,
        setEndTime,
        setGameSettings,
        setCurrentTask,
        setPasswordOptions,
        setHackHint,
        setBoxReveal,
        setHackResult,
        setLockedNegamonChoice,
        setNegamonBetweenPlayback,
    })

    useEffect(() => {
        gameModeRef.current = gameMode
    }, [gameMode])

    useEffect(() => {
        play("bgm-gold-quest", { volume: 0.3 })
        return () => stopBGM()
    }, [play, stopBGM])

    const handleAnswer = (index: number) => {
        if (!socket || !currentQuestion) return
        const pin = getPlayerSession()?.pin
        if (gameModeRef.current === "NEGAMON_BATTLE") {
            if (lockedNegamonChoice !== null) return
            if (!pin) {
                toast({
                    title: t("playToastRoomPinMissingTitle"),
                    description: t("playToastRoomPinMissingDesc"),
                    variant: "destructive",
                })
                return
            }
            setLockedNegamonChoice(index)
            socket.emit("submit-negamon-answer", {
                pin,
                questionId: currentQuestion.id,
                answerIndex: index,
            })
            return
        }
        socket.emit("submit-answer", {
            pin,
            questionId: currentQuestion.id,
            answerIndex: index,
        })
    }

    return (
        <div className="flex flex-col h-screen bg-slate-900 overflow-hidden text-white font-sans">
            <SoundController className="absolute bottom-4 right-16 z-50" />

            {notification && (
                <InteractionNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="flex-1 w-full h-full relative">
                <div className="absolute bottom-4 right-4 z-50">
                    <div
                        className={cn(
                            "w-3 h-3 rounded-full shadow-md transition-colors",
                            socket?.connected ? "bg-green-500" : "bg-red-500 animate-pulse"
                        )}
                        title={socket?.connected ? t("playSocketConnected") : t("playSocketDisconnected")}
                    />
                </div>

                <button
                    onClick={() => {
                        const currentPlayerSession = getPlayerSession()
                        if (socket && currentPlayerSession?.pin) {
                            socket.emit("leave-game", { pin: currentPlayerSession.pin })
                        }
                        clearPlayerSession()
                        window.location.href = "/play"
                    }}
                    className="absolute bottom-4 left-4 z-50 bg-red-600/80 hover:bg-red-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                >
                    {t("playLeaveGame")}
                </button>

                {view === "QUESTION" && currentQuestion && (
                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                        <div className="w-full absolute top-0 left-0 z-20">
                            {gameMode === "NEGAMON_BATTLE" && isNegamonBattlePlayer(player) ? (
                                <NegamonBattleTopBar player={player} />
                            ) : gameMode === "GOLD_QUEST" ? (
                                <GameHeader
                                    player={player as GoldQuestPlayer}
                                    endTime={endTime}
                                    goldGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                                />
                            ) : (
                                <GameHeader
                                    player={toGoldQuestPlayer(player)}
                                    endTime={endTime}
                                    goldGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                                />
                            )}
                        </div>
                        <div className="flex-1 w-full flex flex-col items-center justify-center p-4 pt-16">
                            {gameMode === "NEGAMON_BATTLE" && (
                                <NegamonQuestionHint timeLimitSeconds={currentQuestion.timeLimit} />
                            )}
                            <QuestionCard
                                question={currentQuestion}
                                onAnswer={handleAnswer}
                                locked={gameMode === "NEGAMON_BATTLE" && lockedNegamonChoice !== null}
                            />
                        </div>
                    </div>
                )}

                {view === "NEGAMON_BETWEEN" && (
                    <NegamonBetweenRoundsView playback={negamonBetweenPlayback} />
                )}

                {view === "FEEDBACK" && feedback && (
                    <div className="relative z-10 flex flex-col items-center justify-center h-full">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={cn(
                                "text-7xl font-black drop-shadow-md mb-6",
                                feedback.correct ? "text-green-400" : "text-red-500"
                            )}
                        >
                            {feedback.correct ? t("playFeedbackCorrect") : t("playFeedbackWrong")}
                        </motion.div>
                        <div className="text-2xl text-slate-300 font-bold bg-slate-800/50 px-6 py-3 rounded-full">
                            {feedback.correct ? t("playFeedbackGetReady") : t("playFeedbackNextTime")}
                        </div>
                    </div>
                )}

                {view === "GAME_OVER" && (
                    <div className="flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-90 h-full">
                        <h1 className="mb-8 text-6xl font-black uppercase text-amber-500">{t("playGameOverTitle")}</h1>
                        <div className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800">
                            <div className="text-xl font-bold uppercase text-slate-400">{t("playGameOverFinalRank")}</div>
                            <div className="text-8xl font-black text-slate-800 mb-6">#{player.score}</div>
                            <div className="text-4xl font-black text-amber-600">
                                {gameMode === "NEGAMON_BATTLE" && isNegamonBattlePlayer(player)
                                    ? `${player.battleHp} HP`
                                    : gameMode === "CRYPTO_HACK"
                                      ? `₿ ${(player as CryptoHackPlayer).crypto?.toLocaleString()}`
                                      : (player as GoldQuestPlayer).gold?.toLocaleString()}
                            </div>
                        </div>
                        <button
                            onClick={() => router.push("/play")}
                            className="mt-8 bg-slate-700 text-white font-bold py-3 px-8 rounded-full"
                        >
                            {t("playGameOverBackMenu")}
                        </button>
                    </div>
                )}

                {currentTask && (
                    <TaskOverlay
                        task={currentTask}
                        onComplete={() => {
                            setCurrentTask(null)
                            if (gameMode === "NEGAMON_BATTLE") return
                            if (socket) socket.emit("task-complete", { pin: getPlayerSession()?.pin })
                        }}
                    />
                )}

                {gameMode === "GOLD_QUEST" && view === "CHEST" && (
                    <GoldQuestClient
                        socket={socket}
                        player={player as GoldQuestPlayer}
                        otherPlayers={otherPlayers.filter((other): other is GoldQuestPlayer => !isCryptoHackPlayer(other))}
                        toast={toast}
                        t={t}
                        onNavigate={(v) => {
                            setView(v as GameView)
                            if (v === "QUESTION") {
                                const pin = getPlayerSession()?.pin
                                if (pin && socket) socket.emit("request-question", { pin })
                            }
                        }}
                    />
                )}

                {gameMode === "CRYPTO_HACK" &&
                    (view === "PASSWORD_SELECTION" ||
                        view === "BOX_SELECTION" ||
                        view === "HACK_TARGET" ||
                        view === "HACK_GUESS") && (
                        <CryptoHackClient
                            socket={socket}
                            player={player as CryptoHackPlayer}
                            otherPlayers={otherPlayers.filter(isCryptoHackPlayer)}
                            onNavigate={(v) => setView(v as GameView)}
                            view={view}
                            setView={(nextView) => setView(nextView as GameView)}
                            endTime={endTime}
                            cryptoGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                            passwordOptions={passwordOptions}
                            hackHint={hackHint}
                            hackResult={hackResult}
                            boxReveal={boxReveal}
                        />
                    )}

                <div className="absolute inset-0 -z-10 bg-[url('https://media.blooket.com/image/upload/v1613002626/Backgrounds/goldQuest.jpg')] bg-cover bg-center opacity-20 pointer-events-none" />
            </div>
        </div>
    )
}
