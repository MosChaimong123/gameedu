"use client"

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import { useLanguage } from "@/components/providers/language-provider"
import type { Socket } from "socket.io-client"
import { resolveNegamonTuning } from "@/lib/negamon-battle-tuning"
import type { SoundKey } from "@/hooks/use-sound"
import type {
    CryptoHackPlayer,
    CryptoReward,
    GameSettings,
    GoldQuestPlayer,
    HackTask,
    NegamonRoundHit,
    NegamonRoundResultPayload,
} from "@/lib/types/game"
import { getPlayerReconnectToken, getPlayerSession, savePlayerSession } from "@/lib/player-session"
import { resolveCryptoPasswordOptions } from "./play-game-crypto-passwords"
import type {
    GameStartedPayload,
    GameStateUpdatePayload,
    GameView,
    JoinedSuccessPayload,
    PlayerMode,
    PlayerState,
    QuestionPayload,
} from "./play-game-types"
import type { NegamonBetweenRoundPlayback } from "./negamon-play-ui"
import {
    createNegamonPlayer,
    formatSocketErrorMessage,
    getPlayerScoreValue,
    isCryptoHackPlayer,
    isNegamonBattlePlayer,
    looksLikeNegamonPlayerRow,
} from "./play-game-types"

type ToastLike = (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void

export type UsePlayGameSocketParams = {
    socket: Socket | null
    router: { push: (path: string) => void }
    toast: ToastLike
    play: (soundId: SoundKey, opts?: { volume?: number; loop?: boolean }) => void
    stopBGM: () => void
    gameModeRef: MutableRefObject<PlayerMode>
    navigationTimer: MutableRefObject<NodeJS.Timeout | null>
    hasRequestedFirstQuestion: MutableRefObject<boolean>
    setView: Dispatch<SetStateAction<GameView>>
    setGameMode: Dispatch<SetStateAction<PlayerMode>>
    setPlayer: Dispatch<SetStateAction<PlayerState>>
    setCurrentQuestion: Dispatch<SetStateAction<QuestionPayload | null>>
    setFeedback: Dispatch<SetStateAction<{ correct: boolean } | null>>
    setOtherPlayers: Dispatch<SetStateAction<PlayerState[]>>
    setNotification: Dispatch<SetStateAction<{ message: string; type: "SWAP" | "STEAL" | "generic" } | null>>
    setEndTime: Dispatch<SetStateAction<number | null>>
    setGameSettings: Dispatch<SetStateAction<GameSettings | null>>
    setCurrentTask: Dispatch<SetStateAction<HackTask | null>>
    setPasswordOptions: Dispatch<SetStateAction<string[]>>
    setHackHint: Dispatch<SetStateAction<string | null>>
    setBoxReveal: Dispatch<SetStateAction<{ index: number; reward: CryptoReward } | null>>
    setHackResult: Dispatch<SetStateAction<{ success: boolean; amount?: number; targetName: string } | null>>
    setLockedNegamonChoice: Dispatch<SetStateAction<number | null>>
    setNegamonBetweenPlayback: Dispatch<SetStateAction<NegamonBetweenRoundPlayback | null>>
}

export function usePlayGameSocket(params: UsePlayGameSocketParams): void {
    const {
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
    } = params

    const { t, language } = useLanguage()

    useEffect(() => {
        const skipLegacySocketHandlers = (): boolean => gameModeRef.current === "NEGAMON_BATTLE"

        const playerSession = getPlayerSession()

        if (!playerSession) {
            router.push("/play")
            return
        }

        if (!socket) return

        const handleSocketError = (err: unknown) => {
            const rawMsg =
                err &&
                typeof err === "object" &&
                "message" in err &&
                typeof (err as { message: unknown }).message === "string"
                    ? (err as { message: string }).message
                    : null
            const description = rawMsg
                ? formatSocketErrorMessage(rawMsg, t)
                : t("playSocketGenericServerError")
            if (gameModeRef.current === "NEGAMON_BATTLE") {
                setLockedNegamonChoice(null)
            }
            toast({
                title: t("playToastActionFailed"),
                description,
                variant: "destructive",
            })
        }
        socket.on("error", handleSocketError)

        const reconnectToken = getPlayerReconnectToken(playerSession.pin, playerSession.name)

        socket.emit("join-game", {
            pin: playerSession.pin,
            nickname: playerSession.name,
            reconnectToken: reconnectToken ?? undefined,
            studentId: playerSession.studentId,
            studentCode: playerSession.studentCode,
        })

        socket.emit("get-game-state", { pin: playerSession.pin })

        socket.on("game-started", (data: GameStartedPayload) => {
            console.log("CLIENT RECEIVED GAME START:", data)

            play("bgm-gold-quest", { volume: 0.3 })

            setGameSettings(data.settings)

            if (data.gameMode) {
                console.log("Setting Game Mode from start payload:", data.gameMode)
                setGameMode(data.gameMode)
                gameModeRef.current = data.gameMode
            }

            if (data.gameMode === "NEGAMON_BATTLE") {
                const hp = resolveNegamonTuning({
                    negamonBattle: data.settings?.negamonBattle,
                }).startHp
                setPlayer(createNegamonPlayer(playerSession.name, hp))
                setLockedNegamonChoice(null)
                hasRequestedFirstQuestion.current = true
            }

            console.log("Game started. Waiting for state update to confirm mode and request question...")

            if (data.settings?.winCondition === "TIME" && data.startTime && data.settings.timeLimitMinutes) {
                const end = data.startTime + data.settings.timeLimitMinutes * 60 * 1000
                setEndTime(end)
            } else if (data.settings?.winCondition === "GOLD") {
                setEndTime(null)
            } else if (data.startTime && data.timeLimit) {
                const end = data.startTime + data.timeLimit * 1000
                setEndTime(end)
            }
        })

        socket.on("next-question", (q: QuestionPayload) => {
            if (skipLegacySocketHandlers()) return
            setCurrentQuestion(q)
            setView("QUESTION")
            setFeedback(null)
        })

        socket.on("answer-result", (res: { correct: boolean }) => {
            if (skipLegacySocketHandlers()) return
            setFeedback(res)
            setView("FEEDBACK")

            play(res.correct ? "correct" : "wrong")

            if (res.correct) {
                if (navigationTimer.current) clearTimeout(navigationTimer.current)

                navigationTimer.current = setTimeout(() => {
                    console.log("Navigating... Mode:", gameModeRef.current)

                    if (gameModeRef.current === "GOLD_QUEST") {
                        setView("CHEST")
                    } else if (gameModeRef.current === "CRYPTO_HACK") {
                        console.log("Skipping CHEST nav because mode is CRYPTO_HACK. Waiting for choose-box...")
                    }
                    navigationTimer.current = null
                }, 1500)
            } else {
                setTimeout(() => {
                    const pin = playerSession.pin
                    if (pin) socket.emit("request-question", { pin })
                }, 2000)
            }
        })

        socket.on("game-state-update", (data: GameStateUpdatePayload) => {
            const explicitNegamon = data.gameMode === "NEGAMON_BATTLE"
            const fallbackNegamon =
                data.gameMode == null && data.players.some(looksLikeNegamonPlayerRow)

            if (explicitNegamon || fallbackNegamon) {
                setGameMode("NEGAMON_BATTLE")
                gameModeRef.current = "NEGAMON_BATTLE"
                hasRequestedFirstQuestion.current = true

                const others = data.players.filter((p) => p.name !== playerSession.name)
                setOtherPlayers(others)

                const me = data.players.find((p) => p.name === playerSession.name)
                const sorted = [...data.players].sort(
                    (a, b) =>
                        getPlayerScoreValue(b, "NEGAMON_BATTLE") - getPlayerScoreValue(a, "NEGAMON_BATTLE")
                )
                const rank = sorted.findIndex((p) => p.name === playerSession.name) + 1

                if (me && isNegamonBattlePlayer(me)) {
                    setPlayer((prev) => ({ ...prev, ...me, score: rank }))
                }
                return
            }

            const others = data.players.filter((p) => p.name !== playerSession.name)
            setOtherPlayers(others)

            const { hackState, passwordOptions } = data

            const me = data.players.find((p) => p.name === playerSession.name)
            const isCrypto = me ? isCryptoHackPlayer(me) : false
            const newMode: PlayerMode = isCrypto ? "CRYPTO_HACK" : "GOLD_QUEST"

            if (me && gameModeRef.current !== newMode) {
                console.log(`Switching Game Mode: ${gameModeRef.current} -> ${newMode}`)
                setGameMode(newMode)
                gameModeRef.current = newMode
            }

            if (passwordOptions && passwordOptions.length > 0) {
                let opts = resolveCryptoPasswordOptions(passwordOptions)

                if (data.players && Array.isArray(data.players)) {
                    const taken = new Set(
                        data.players.flatMap((p) => (isCryptoHackPlayer(p) && p.password ? [p.password] : []))
                    )

                    opts = opts.filter((p: string) => !taken.has(p))
                }

                setPasswordOptions(opts)
            }

            if (newMode === "GOLD_QUEST") {
                if (!hasRequestedFirstQuestion.current) {
                    const pin = playerSession.pin
                    if (pin) {
                        console.log("Requesting initial question for GOLD_QUEST.")
                        socket.emit("request-question", { pin })
                        hasRequestedFirstQuestion.current = true
                    }
                }
            } else if (newMode === "CRYPTO_HACK") {
                if (hackState === "PASSWORD_SELECTION") {
                    setView((v) => {
                        if (v !== "PASSWORD_SELECTION") {
                            console.log("Enforcing PASSWORD_SELECTION view")
                            return "PASSWORD_SELECTION"
                        }
                        return v
                    })
                    hasRequestedFirstQuestion.current = true
                } else if (hackState === "HACKING") {
                    if (!hasRequestedFirstQuestion.current) {
                        console.log("Late join in HACKING phase. Force Update.")

                        setView((v) => (v === "LOBBY" ? "QUESTION" : v))

                        const pin = playerSession.pin
                        if (pin) socket.emit("request-question", { pin })
                        hasRequestedFirstQuestion.current = true
                    }
                }
            }

            const sorted = [...data.players].sort(
                (a, b) => getPlayerScoreValue(b, newMode) - getPlayerScoreValue(a, newMode)
            )

            const rank = sorted.findIndex((p) => p.name === playerSession.name) + 1

            if (me) {
                setPlayer((prev) => ({
                    ...prev,
                    ...me,
                    score: rank,
                }))
                if ("isGlitched" in me) {
                    const hackMe = me as CryptoHackPlayer
                    setCurrentTask(hackMe.currentTask || null)
                }
            }
        })

        socket.on(
            "negamon-battle-state",
            (data: {
                phase: "QUESTION" | "BETWEEN"
                currentQuestion: QuestionPayload | null
                players: PlayerState[]
            }) => {
                setGameMode("NEGAMON_BATTLE")
                gameModeRef.current = "NEGAMON_BATTLE"
                hasRequestedFirstQuestion.current = true

                if (data.players?.length) {
                    const me = data.players.find((p) => p.name === playerSession.name)
                    const sorted = [...data.players].sort(
                        (a, b) =>
                            getPlayerScoreValue(b, "NEGAMON_BATTLE") -
                            getPlayerScoreValue(a, "NEGAMON_BATTLE")
                    )
                    const rank = sorted.findIndex((p) => p.name === playerSession.name) + 1
                    if (me && isNegamonBattlePlayer(me)) {
                        setPlayer((prev) => ({ ...prev, ...me, score: rank }))
                    }
                    setOtherPlayers(data.players.filter((p) => p.name !== playerSession.name))
                }
                if (data.phase === "BETWEEN") {
                    setView("NEGAMON_BETWEEN")
                    setLockedNegamonChoice(null)
                    return
                }
                if (data.currentQuestion) {
                    setNegamonBetweenPlayback(null)
                    setCurrentQuestion(data.currentQuestion)
                    setView("QUESTION")
                    setFeedback(null)
                    setLockedNegamonChoice(null)
                }
            }
        )

        socket.on("negamon-round-result", (data: NegamonRoundResultPayload) => {
            const logs = Array.isArray(data?.logs) ? data.logs : []
            const hits: NegamonRoundHit[] = Array.isArray(data?.hits) ? data.hits : []
            if (gameModeRef.current === "NEGAMON_BATTLE") {
                const list = (Array.isArray(data?.players) ? data.players : []).filter(isNegamonBattlePlayer)
                setNegamonBetweenPlayback(list.length ? { hits, players: list } : null)
            }
            const me = playerSession.name?.trim() ?? ""

            let text: string
            if (hits.length > 0 && me) {
                const mine = hits.filter((h) => h.attackerName === me || h.targetName === me)
                if (mine.length > 0) {
                    const cap = 4
                    const parts = mine.slice(0, cap).map((h) => {
                        const ko = h.eliminated ? ` ${t("playNegamonKoShort")}` : ""
                        if (h.attackerName === me) {
                            return `${t("playNegamonYouHit", { target: h.targetName, damage: h.damage })}${ko}`
                        }
                        return `${t("playNegamonYouWereHit", { attacker: h.attackerName, damage: h.damage })}${ko}`
                    })
                    const extra =
                        mine.length > cap
                            ? ` · ${t("playNegamonRoundMoreHits", { count: mine.length - cap })}`
                            : ""
                    text = parts.join(" · ") + extra
                } else {
                    text = logs.join(" · ")
                }
            } else {
                text = logs.join(" · ")
            }

            if (text) {
                setNotification({
                    message: text.length > 220 ? `${text.slice(0, 220)}…` : text,
                    type: "generic",
                })
            }
        })

        socket.on("interaction-effect", (data: { source: string; target: string; type: "SWAP" | "STEAL" }) => {
            if (skipLegacySocketHandlers()) return
            if (data.target === playerSession.name) {
                play(data.type === "SWAP" ? "swap" : "steal")

                const msg =
                    data.type === "SWAP"
                        ? t("playNotifSwapGold", { source: data.source })
                        : t("playNotifStealGold", { source: data.source })

                setNotification({ message: msg, type: data.type })
            }
        })

        socket.on("choose-box", () => {
            if (skipLegacySocketHandlers()) return
            console.log("CLIENT RECEIVED CHOOSE-BOX")
            if (navigationTimer.current) clearTimeout(navigationTimer.current)
            setBoxReveal(null)
            setView("BOX_SELECTION")
        })

        socket.on("choose-password", (data: { options: string[] }) => {
            if (skipLegacySocketHandlers()) return
            console.log("Setting Game Mode to CRYPTO_HACK via choose-password")
            setGameMode("CRYPTO_HACK")
            gameModeRef.current = "CRYPTO_HACK"

            setPasswordOptions(resolveCryptoPasswordOptions(data.options))
            setView("PASSWORD_SELECTION")
        })

        socket.on("hack-options", (data: { targetId: string; options: string[]; hint?: string }) => {
            if (skipLegacySocketHandlers()) return
            sessionStorage.setItem("hack_target_id", data.targetId)

            setPasswordOptions(data.options)
            setHackHint(data.hint || null)
            setView("HACK_GUESS")
        })

        socket.on("box-reveal", (data: { index: number; reward: CryptoReward; newTotal: number }) => {
            if (skipLegacySocketHandlers()) return
            setBoxReveal(data)
            play(data.reward.type === "HACK" ? "chest-open" : "correct")

            if (data.reward.type === "HACK") {
                setTimeout(() => setView("HACK_TARGET"), 2000)
            } else {
                setPlayer((prev) => ({ ...prev, crypto: data.newTotal }))

                setTimeout(() => {
                    setBoxReveal(null)
                    setView("QUESTION")
                    const pin = playerSession.pin
                    if (pin) socket.emit("request-question", { pin })
                }, 2000)
            }
        })

        socket.on("hack-result", (data: { success: boolean; amount?: number; targetName: string }) => {
            if (skipLegacySocketHandlers()) return
            setHackResult(data)

            setTimeout(() => {
                setHackResult(null)
                setView("QUESTION")
                const pin = playerSession.pin
                if (pin) socket.emit("request-question", { pin })
            }, 3000)
        })

        socket.on("selection-error", (payload?: { message?: string }) => {
            if (skipLegacySocketHandlers()) return
            const raw =
                payload && typeof payload.message === "string" ? payload.message : null
            if (raw) {
                toast({
                    title: t("playToastActionFailed"),
                    description: formatSocketErrorMessage(raw, t),
                    variant: "destructive",
                })
            }
            console.log("Selection error, returning to question.")
            setView("QUESTION")
            const pin = playerSession.pin
            if (pin) socket.emit("request-question", { pin })
        })

        socket.on("game-over", (data: { players: PlayerState[] }) => {
            stopBGM()
            play("game-over")

            const me = data.players.find((p) => p.name === playerSession.name)
            if (me) {
                const rank = data.players.findIndex((p) => p.name === playerSession.name) + 1
                if (isNegamonBattlePlayer(me)) {
                    setPlayer((prev) => ({ ...prev, ...me, score: rank }))
                } else if (isCryptoHackPlayer(me)) {
                    setPlayer((prev) => ({ ...prev, ...me, score: rank }))
                } else {
                    const g = me as GoldQuestPlayer
                    setPlayer((prev) => ({ ...prev, gold: g.gold, score: rank }))
                }
            }
            setNegamonBetweenPlayback(null)
            setView("GAME_OVER")
        })

        socket.on("game-phase-change", (data: { phase: string }) => {
            if (skipLegacySocketHandlers()) return
            if (data.phase === "HACKING") {
                socket.emit("request-question", { pin: playerSession.pin })
            }
        })

        socket.on("player-hacked", (data: { hacker: string; amount: number; isGlitched: boolean; task?: HackTask }) => {
            if (skipLegacySocketHandlers()) return
            play("wrong")

            setNotification({
                message: t("playNotifHacked", { hacker: data.hacker, amount: data.amount }),
                type: "generic",
            })

            if (data.isGlitched && data.task) {
                setCurrentTask(data.task)
            }
        })

        socket.on("task-complete", () => {
            if (gameModeRef.current === "NEGAMON_BATTLE") return
            console.log("Task Completed! Clearing glitch.")
            setCurrentTask(null)
            play("correct")
        })

        socket.on("joined-success", (data: JoinedSuccessPayload) => {
            console.log("Joined success. Server says Mode:", data?.gameMode)

            if (data?.reconnectToken) {
                savePlayerSession({
                    pin: data.pin,
                    name: data.nickname,
                    reconnectToken: data.reconnectToken,
                    studentId: data.studentId,
                    studentCode: data.studentCode,
                })
            }

            if (data?.gameMode) {
                setGameMode(data.gameMode)
                gameModeRef.current = data.gameMode
            }

            if (data?.gameMode === "NEGAMON_BATTLE") {
                setPlayer(createNegamonPlayer(data.nickname))
                hasRequestedFirstQuestion.current = true
            }

            const pin = playerSession.pin
            if (pin && gameModeRef.current === "GOLD_QUEST") {
                socket.emit("request-question", { pin })
            } else {
                console.log("Waiting for game logic based on mode:", gameModeRef.current)
            }
        })

        return () => {
            socket.off("error", handleSocketError)
            socket.off("joined-success")
            socket.off("game-started")
            socket.off("game-phase-change")
            socket.off("next-question")
            socket.off("answer-result")
            socket.off("game-state-update")
            socket.off("negamon-battle-state")
            socket.off("negamon-round-result")
            socket.off("interaction-effect")
            socket.off("game-over")
            socket.off("player-hacked")
            socket.off("task-complete")
            socket.off("choose-box")
            socket.off("choose-password")
            socket.off("hack-options")
            socket.off("box-reveal")
            socket.off("hack-result")
            socket.off("selection-error")
        }
        // This effect manages the socket subscription boundary. Setter and ref params are stable by contract.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, router, play, stopBGM, toast, language, t])
}
