"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSocket } from "@/components/providers/socket-provider"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Users, Copy, Loader2, Play, ShieldCheck, AlertTriangle } from "lucide-react"
import { GameModeSelector } from "@/components/host/game-mode-selector"
import { GoldQuestSettings } from "@/components/host/settings/gold-quest-settings"
import { CryptoHackSettings } from "@/components/host/settings/crypto-hack-settings"
import { GoldQuestHostView } from "@/components/game/gold-quest/host-view"
import { CryptoHackHostView } from "@/components/game/crypto-hack/host-view"
import { NegamonBattleHostView } from "@/components/game/negamon/negamon-battle-host-view"
import {
    GoldQuestPlayer,
    CryptoHackPlayer,
    NegamonBattlePlayer,
    GameSettings,
    NegamonRoundResultPayload,
} from "@/lib/types/game"
import { cn } from "@/lib/utils"

import { useSound } from "@/hooks/use-sound"
import { SoundController } from "@/components/game/sound-controller"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/components/providers/language-provider"
import { isTeacherOrAdmin } from "@/lib/role-guards"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatSocketErrorMessage } from "@/app/play/game/play-game-types"
import { isSocketSessionResetError } from "@/lib/socket-error-messages"
import { isNegamonBattleHostEnabled } from "@/lib/negamon-battle-host-enabled"

type HostView = "SELECT_MODE" | "SETTINGS" | "LOBBY" | "PLAYING" | "ENDED"
type GameMode = "GOLD_QUEST" | "CRYPTO_HACK" | "NEGAMON_BATTLE"
type HostPlayer = GoldQuestPlayer | CryptoHackPlayer | NegamonBattlePlayer

type HostEvent = {
    source: string
    target: string
    type: "SWAP" | "STEAL"
    amount?: number
}

type HostGameStartedPayload = {
    startTime: number
    settings?: GameSettings
    mode?: Extract<GameMode, "GOLD_QUEST" | "CRYPTO_HACK" | "NEGAMON_BATTLE">
    gameMode?: GameMode
    timeLimit?: number
}

function isCryptoHackPlayer(player: HostPlayer): player is CryptoHackPlayer {
    return "crypto" in player
}

function isNegamonBattlePlayer(player: HostPlayer): player is NegamonBattlePlayer {
    return "battleHp" in player && typeof (player as NegamonBattlePlayer).battleHp === "number"
}

/** True only in the browser after hydration — matches SSR snapshot (false) to avoid hydration mismatches. */
function useIsClient() {
    return useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    )
}

export default function HostLobbyPage() {
    const params = useParams()
    const setId = params.setId as string
    const { socket, isConnected } = useSocket()
    const { data: session, status: sessionStatus } = useSession()
    const { play, stopBGM } = useSound()
    const router = useRouter()
    const { toast } = useToast()
    const { t } = useLanguage()
    const toastRef = useRef(toast)
    const tRef = useRef(t)
    useEffect(() => {
        toastRef.current = toast
        tRef.current = t
    }, [toast, t])

    const [pin, setPin] = useState<string | null>(null)
    const [players, setPlayers] = useState<HostPlayer[]>([])
    /** True only while waiting for `game-created` after emitting `create-game` */
    const [creatingGame, setCreatingGame] = useState(false)
    const [view, setView] = useState<HostView>("SELECT_MODE")
    const [gameEvents, setGameEvents] = useState<HostEvent[]>([])
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)
    const [selectedMode, setSelectedMode] = useState<GameMode>("GOLD_QUEST")

    // Timer State
    const [timeLeft, setTimeLeft] = useState(0)
    const [endTime, setEndTime] = useState<number | null>(null)
    const [isCancelLobbyDialogOpen, setIsCancelLobbyDialogOpen] = useState(false)
    const [isNegamonIdentityStartDialogOpen, setIsNegamonIdentityStartDialogOpen] = useState(false)
    const hostTokenStorageKey = `host_reconnect_token_${setId}`
    /** จาก `?classroomId=` — ส่งตอน create-game เพื่อซิงค์ EXP หลังจบ Negamon */
    const [rewardClassroomFromQuery, setRewardClassroomFromQuery] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        const timer = window.setTimeout(() => {
            const params = new URLSearchParams(window.location.search)
            const rawClassroom = params.get("classroomId")
            setRewardClassroomFromQuery(rawClassroom?.trim() || null)

            // Pre-select game mode from ?mode= query param (e.g. from NegamonBattleLauncher)
            const rawMode = params.get("mode") as GameMode | null
            const negamonOk = isNegamonBattleHostEnabled()
            if (rawMode === "GOLD_QUEST" || rawMode === "CRYPTO_HACK") {
                setSelectedMode(rawMode)
                setView("SETTINGS")
            } else if (rawMode === "NEGAMON_BATTLE" && negamonOk) {
                setSelectedMode("NEGAMON_BATTLE")
                setView("SETTINGS")
            }
        }, 0)
        return () => window.clearTimeout(timer)
    }, [])

    const [negamonHostMeta, setNegamonHostMeta] = useState<{
        phase: "QUESTION" | "BETWEEN"
        roundIndex: number
        preview: string | null
    } | null>(null)
    const [negamonBattleLogs, setNegamonBattleLogs] = useState<string[]>([])

    const isClient = useIsClient()
    const uniqueLobbyPlayers = Array.from(new Map(players.map((player) => [player.id, player])).values())
    const negamonIdentityStatus =
        selectedMode === "NEGAMON_BATTLE" && rewardClassroomFromQuery
            ? {
                  linked: uniqueLobbyPlayers.filter((player) => Boolean(player.studentId)).length,
                  total: uniqueLobbyPlayers.length,
              }
            : null

    useEffect(() => {
        if (sessionStatus === "authenticated" && !isTeacherOrAdmin(session?.user?.role)) {
            router.replace("/dashboard")
        }
    }, [router, session?.user?.role, sessionStatus])

    // BGM Management
    useEffect(() => {
        if (view === "PLAYING") {
            play("bgm-gold-quest", { volume: 0.3 })
        } else if (view === "ENDED") {
            stopBGM()
            play("game-over")
        } else {
            // Lobby / Select Mode / Settings
            play("bgm-lobby", { volume: 0.3 })
        }

        return () => {
            // Cleanup handled by next effect execution or unmount
        }
    }, [view, play, stopBGM]) // Re-run when view changes

    useEffect(() => {
        if (!socket || !isConnected || !session?.user) return;

        // ... (rest of existing effect) ...
        const savedPin = sessionStorage.getItem(`host_pin_${setId}`)
        const savedHostToken = sessionStorage.getItem(hostTokenStorageKey)

        if (savedPin && savedHostToken) {
            console.log("Attempting to reconnect as host:", savedPin);
            socket.emit("reconnect-host", { pin: savedPin, reconnectToken: savedHostToken })
            window.requestAnimationFrame(() => {
                setPin(savedPin)
                // View update will trigger BGM change
                setView("LOBBY") // Or PLAYING if server tells us
            })
        }

        // Listeners
        socket.on("game-created", (data: { pin: string, hostReconnectToken: string }) => {
            setPin(data.pin)
            sessionStorage.setItem(`host_pin_${setId}`, data.pin)
            sessionStorage.setItem(hostTokenStorageKey, data.hostReconnectToken)
            setCreatingGame(false)
            setView("LOBBY")
        })

        socket.on(
            "host-reconnected",
            (data: { status: "LOBBY" | "PLAYING" | "ENDED"; gameMode?: GameMode }) => {
                setView(data.status === "LOBBY" ? "LOBBY" : data.status)
                if (data.gameMode === "NEGAMON_BATTLE") setSelectedMode("NEGAMON_BATTLE")
                else if (data.gameMode === "CRYPTO_HACK") setSelectedMode("CRYPTO_HACK")
                else if (data.gameMode === "GOLD_QUEST") setSelectedMode("GOLD_QUEST")
            }
        )

        socket.on("player-joined", (data: { players: HostPlayer[] }) => {
            console.log("Host Received Players Update:", data.players);
            setPlayers(data.players)
        })

        // Listen for game start
        socket.on("game-started", (data: HostGameStartedPayload) => {
            console.log("Game Started Data:", data);
            setView("PLAYING")

            const incomingMode = data.gameMode ?? data.mode
            if (incomingMode === "NEGAMON_BATTLE") {
                setSelectedMode("NEGAMON_BATTLE")
                setNegamonBattleLogs([])
                setNegamonHostMeta(null)
            } else if (incomingMode === "CRYPTO_HACK") setSelectedMode("CRYPTO_HACK")
            else setSelectedMode("GOLD_QUEST")

            if (data.settings) setGameSettings(data.settings);

            if (data.settings) {
                if (data.settings.winCondition === "TIME" && data.startTime && data.settings.timeLimitMinutes) {
                    const end = data.startTime + (data.settings.timeLimitMinutes * 60 * 1000)
                    setEndTime(end)
                    setTimeLeft(data.settings.timeLimitMinutes * 60)
                } else if (data.settings.winCondition === "GOLD") {
                    setEndTime(null) // Disable timer logic
                    setTimeLeft(0)
                }
            } else if (data.startTime && data.timeLimit) {
                // Fallback for legacy
                const end = data.startTime + (data.timeLimit * 1000)
                setEndTime(end)
                setTimeLeft(data.timeLimit)
            } else {
                // Final Fallback
                console.warn("Missing timer data, using fallback");
                const limit = 420;
                setTimeLeft(limit)
                setEndTime(Date.now() + (limit * 1000))
            }
        })

        socket.on("game-state-update", (data: { players: HostPlayer[] }) => {
            setPlayers(data.players)
        })

        socket.on(
            "negamon-battle-state",
            (data: {
                phase: "QUESTION" | "BETWEEN"
                roundIndex: number
                currentQuestion: { question: string } | null
            }) => {
                setNegamonHostMeta({
                    phase: data.phase,
                    roundIndex: data.roundIndex,
                    preview: data.currentQuestion?.question ?? null,
                })
            }
        )

        socket.on("negamon-round-result", (data: NegamonRoundResultPayload) => {
            const logs = Array.isArray(data?.logs) ? data.logs : []
            const hits = Array.isArray(data?.hits) ? data.hits : []
            const hitLines =
                hits.length > 0
                    ? hits.map(
                          (h) =>
                              `${h.attackerName} → ${h.targetName} (−${h.damage})${h.eliminated ? " K.O." : ""}${h.fastStrike ? " ⚡" : ""}`
                      )
                    : []
            const redundantWithHits = (l: string) =>
                l.includes("โจมตี") || /K\.O\./.test(l)
            const combined =
                hitLines.length > 0 ? [...hitLines, ...logs.filter((l) => !redundantWithHits(l))] : logs
            setNegamonBattleLogs((prev) => [...prev, ...combined].slice(-40))
        })

        socket.on("interaction-effect", (event: HostEvent) => {
            setGameEvents(prev => [...prev, event])
            if (event.type === "SWAP") play("swap")
            if (event.type === "STEAL") play("steal")
        })

        socket.on("game-over", () => {
            setView("ENDED");
            setEndTime(null);
            sessionStorage.removeItem(`host_pin_${setId}`);
            sessionStorage.removeItem(hostTokenStorageKey);
        })

        socket.on("error", (err: { message?: string }) => {
            console.error("Socket Error:", err);
            setCreatingGame(false)
            const raw = typeof err?.message === "string" ? err.message : ""
            if (isSocketSessionResetError(raw)) {
                sessionStorage.removeItem(`host_pin_${setId}`);
                sessionStorage.removeItem(hostTokenStorageKey);
                window.location.reload();
                return
            }
            if (raw) {
                const tr = tRef.current
                toastRef.current({
                    title: tr("playToastActionFailed"),
                    description: formatSocketErrorMessage(raw, tr),
                    variant: "destructive",
                })
            }
        })

        return () => {
            stopBGM() // Stop on unmount
            socket.off("game-created")
            socket.off("host-reconnected")
            socket.off("player-joined")
            socket.off("game-started")
            socket.off("game-state-update")
            socket.off("negamon-battle-state")
            socket.off("negamon-round-result")
            socket.off("interaction-effect")
            socket.off("game-over")
            socket.off("error")
        }
    }, [socket, isConnected, session, setId, hostTokenStorageKey, play, stopBGM])

    // If create-game hangs (server not responding), release the UI
    useEffect(() => {
        if (!creatingGame) return
        const timeoutId = window.setTimeout(() => {
            setCreatingGame(false)
            toast({
                title: t("hostCreateRoomTimeoutTitle"),
                description: t("hostCreateRoomTimeoutDesc"),
                variant: "destructive",
            })
        }, 45_000)
        return () => window.clearTimeout(timeoutId)
    }, [creatingGame, toast, t])

    // Timer Interval
    // ... (keep existing) ...
    useEffect(() => {
        if (view !== "PLAYING" || !endTime) return

        const interval = setInterval(() => {
            const now = Date.now()
            const left = Math.max(0, Math.ceil((endTime - now) / 1000))
            setTimeLeft(left)

            if (left <= 0) {
                clearInterval(interval)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [view, endTime])

    const copyPin = () => {
        if (pin) navigator.clipboard.writeText(pin)
    }

    const handleBackFromSelectMode = () => {
        if (typeof window === "undefined") return
        const cid = new URLSearchParams(window.location.search).get("classroomId")?.trim()
        router.push(
            cid
                ? `/dashboard/my-sets?classroomId=${encodeURIComponent(cid)}`
                : "/dashboard/my-sets"
        )
    }

    const handleSelectMode = (modeId: string) => {
        console.log("handleSelectMode called with:", modeId);
        if (modeId === "gold-quest") {
            setSelectedMode("GOLD_QUEST");
            setView("SETTINGS");
        } else if (modeId === "crypto-hack") {
            setSelectedMode("CRYPTO_HACK");
            setView("SETTINGS");
        } else if (modeId === "negamon-battle") {
            if (!isNegamonBattleHostEnabled()) return
            setSelectedMode("NEGAMON_BATTLE");
            setView("SETTINGS");
        }
    }

    const handleHostGame = (settings: GameSettings) => {
        if (!session?.user) return
        if (!socket || !isConnected) {
            toast({
                title: t("hostSocketNotConnectedTitle"),
                description: t("hostSocketNotConnectedDesc"),
                variant: "destructive",
            })
            return
        }
        setCreatingGame(true)
        socket.emit("create-game", {
            setId,
            hostId: session.user.id,
            settings,
            mode: selectedMode,
            rewardClassroomId:
                selectedMode === "NEGAMON_BATTLE" && rewardClassroomFromQuery
                    ? rewardClassroomFromQuery
                    : undefined,
        })
    }

    const emitStartGame = () => {
        if (socket) {
            socket.emit("start-game", { pin });
            setView("PLAYING"); // Optimistic update
        }
    }

    const startGame = () => {
        if (
            negamonIdentityStatus &&
            negamonIdentityStatus.total > 0 &&
            negamonIdentityStatus.linked < negamonIdentityStatus.total
        ) {
            setIsNegamonIdentityStartDialogOpen(true)
            return
        }
        emitStartGame()
    }

    const sessionLoadingShell = (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-brand-pink" />
            <p className="text-slate-500">{t("hostLoading")}</p>
        </div>
    )

    if (!isClient) {
        return sessionLoadingShell
    }

    if (sessionStatus === "loading") {
        return sessionLoadingShell
    }

    if (sessionStatus === "unauthenticated" || !session?.user) {
        return <div className="p-8 text-center">{t("hostPleaseLogin")}</div>
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return null
    }

    if (creatingGame) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-brand-pink" />
                <p className="text-slate-500">{t("hostCreatingRoom")}</p>
            </div>
        )
    }

    if (view === "SELECT_MODE") {
        // Audio Toggle
        return <>
            <SoundController className="fixed top-4 right-4" />
            <GameModeSelector onSelect={handleSelectMode} onBack={handleBackFromSelectMode} />
        </>
    }

    if (view === "SETTINGS") {
        if (selectedMode === "CRYPTO_HACK") {
            return (
                <>
                    <SoundController className="fixed top-4 right-4" />
                    <CryptoHackSettings onHost={handleHostGame} onBack={() => setView("SELECT_MODE")} />
                </>
            )
        }
        return (
            <>
                <SoundController className="fixed top-4 right-4" />
                <GoldQuestSettings
                    onHost={handleHostGame}
                    onBack={() => setView("SELECT_MODE")}
                    forNegamonBattle={selectedMode === "NEGAMON_BATTLE"}
                    linkedClassroomId={rewardClassroomFromQuery}
                />
            </>
        )
    }

    // ... (keep handleEndGame) ...
    const handleEndGame = () => {
        if (socket && pin) {
            socket.emit("end-game", { pin });
        }
    }

    const handleCancelLobby = () => {
        handleEndGame()
        sessionStorage.removeItem(`host_pin_${setId}`)
        sessionStorage.removeItem(hostTokenStorageKey)
        setPin(null)
        setPlayers([])
        setView("SELECT_MODE")
        setIsCancelLobbyDialogOpen(false)
    }

    // Render Game View if Playing
    // Render Game View if Playing
    if (view === "PLAYING") {
        if (selectedMode === "NEGAMON_BATTLE") {
            return (
                <>
                    <SoundController className="fixed bottom-6 left-6 z-[60]" />
                    <NegamonBattleHostView
                        players={players.filter(isNegamonBattlePlayer)}
                        timeLeft={timeLeft}
                        onEndGame={handleEndGame}
                        pin={pin || ""}
                        battlePhase={negamonHostMeta?.phase}
                        roundIndex={negamonHostMeta?.roundIndex}
                        currentQuestionPreview={negamonHostMeta?.preview ?? null}
                        battleLogs={negamonBattleLogs}
                    />
                </>
            )
        }
        if (selectedMode === "CRYPTO_HACK") {
            return <>
                <SoundController className="fixed bottom-6 left-6 z-[60]" />
                <CryptoHackHostView
                    players={players.filter(isCryptoHackPlayer)}
                    events={gameEvents}
                    timeLeft={timeLeft}
                    onEndGame={handleEndGame}
                    cryptoGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                    pin={pin || ""}
                />
            </>
        }
        return <>
            <SoundController className="fixed bottom-6 left-6 z-[60]" />
            <GoldQuestHostView
                players={players.filter((player): player is GoldQuestPlayer => !isCryptoHackPlayer(player) && !isNegamonBattlePlayer(player))}
                events={gameEvents}
                timeLeft={timeLeft}
                onEndGame={handleEndGame}
                goldGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                pin={pin || ""}
            />
        </>
    }

    // Render Game Over (Host)
    if (view === "ENDED") {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white">
                <SoundController className="fixed top-6 right-6" />
                {/* ... rest of game over ... */}
                {/* ... rest of game over ... */}
                <h1 className="text-6xl font-black text-amber-500 mb-8 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">{t("hostGameOverTitle")}</h1>

                <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-2xl border-4 border-slate-700 shadow-2xl mb-8">
                    <h2 className="text-2xl font-bold text-center mb-6 uppercase tracking-widest text-slate-400">{t("hostFinalStandings")}</h2>
                    <div className="space-y-4">
                        {players.slice(0, 3).map((player, index) => (
                            <div key={player.id} className={cn(
                                "flex items-center p-4 rounded-xl border-b-4",
                                index === 0 ? "bg-amber-400 border-amber-600 text-amber-900" :
                                    index === 1 ? "bg-slate-300 border-slate-500 text-slate-900" :
                                        "bg-amber-700 border-amber-900 text-amber-100"
                            )}>
                                <div className="font-black text-3xl w-12 text-center mr-4">#{index + 1}</div>
                                <div className="flex-1 font-bold text-xl">{player.name}</div>
                                <div className="font-black text-2xl">
                                    {isNegamonBattlePlayer(player)
                                        ? `${player.battleHp} HP`
                                        : ("crypto" in player) ?
                                        `₿ ${(player as CryptoHackPlayer).crypto.toLocaleString()}` :
                                        (player as GoldQuestPlayer).gold?.toLocaleString() || "0"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Button
                    size="lg"
                    onClick={() => router.push("/dashboard")}
                    className="rounded-full bg-brand-pink px-12 py-6 text-xl font-bold text-white shadow-[0_4px_0_rgb(190,24,93)] transition-all hover:opacity-95 active:translate-y-1"
                >
                    {t("hostBackToMyQuestionSets")}
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            <SoundController className="fixed top-6 right-6" />

            {/* Top Bar */}
            <div className="p-6 flex justify-between items-center border-b border-slate-800">
                <h1 className="text-2xl font-bold text-brand-pink">
                    {t("appName")}
                </h1>
                <div className="flex items-center space-x-4">
                    <div className="bg-slate-800 px-4 py-2 rounded-lg flex items-center space-x-2">
                        <Users className="text-blue-400 h-5 w-5" />
                        <span className="font-bold text-xl">{players.length}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">

                {/* PIN Display */}
                <div className="text-center space-y-2 animate-in zoom-in-50 duration-500">
                    <p className="text-slate-400 uppercase tracking-widest text-sm font-semibold">{t("hostJoinWithGameCode")}</p>
                    <div className="relative group cursor-pointer" onClick={copyPin}>
                        <h1 className="text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                            {pin}
                        </h1>
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-6 w-6 text-slate-500" />
                        </div>
                    </div>
                    <p className="text-slate-500">
                        {t("hostGoToPlayPrefix")}{" "}
                        <span className="text-purple-400 font-bold">{t("hostPlayUrlLabel")}</span>
                    </p>
                </div>

                {/* Player Grid */}
                <div className="w-full max-w-5xl">
                    {negamonIdentityStatus && negamonIdentityStatus.total > 0 && (
                        <div
                            className={cn(
                                "mb-4 flex flex-wrap items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold",
                                negamonIdentityStatus.linked === negamonIdentityStatus.total
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                            )}
                        >
                            {negamonIdentityStatus.linked === negamonIdentityStatus.total ? (
                                <ShieldCheck className="h-4 w-4" />
                            ) : (
                                <AlertTriangle className="h-4 w-4" />
                            )}
                            <span>
                                {t("hostNegamonIdentitySummary", {
                                    linked: negamonIdentityStatus.linked,
                                    total: negamonIdentityStatus.total,
                                })}
                            </span>
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {uniqueLobbyPlayers.map((player) => (
                            <Card key={player.id} className="bg-slate-800 border-none p-4 flex flex-col items-center justify-center gap-2 animate-in scale-0 duration-300 fill-mode-both">
                                <span className="font-bold text-lg text-white truncate">{player.name}</span>
                                {selectedMode === "NEGAMON_BATTLE" && rewardClassroomFromQuery && (
                                    <span
                                        className={cn(
                                            "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                                            player.studentId
                                                ? "bg-emerald-500/15 text-emerald-300"
                                                : "bg-amber-500/15 text-amber-300"
                                        )}
                                        title={
                                            player.studentId
                                                ? t("hostNegamonIdentityLinked")
                                                : t("hostNegamonIdentityUnlinked")
                                        }
                                    >
                                        {player.studentId ? (
                                            <ShieldCheck className="h-3 w-3" />
                                        ) : (
                                            <AlertTriangle className="h-3 w-3" />
                                        )}
                                        <span className="truncate">
                                            {player.studentId
                                                ? t("hostNegamonIdentityLinked")
                                                : t("hostNegamonIdentityUnlinked")}
                                        </span>
                                    </span>
                                )}
                            </Card>
                        ))}
                    </div>
                    {players.length === 0 && (
                        <div className="text-center text-slate-600 mt-12 animate-pulse">
                            {t("hostWaitingForPlayers")}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="p-6 border-t border-slate-800 flex justify-end gap-4">
                <Button
                    variant="destructive"
                    size="lg"
                    className="font-bold text-xl px-8 py-8 rounded-xl"
                    onClick={() => setIsCancelLobbyDialogOpen(true)}
                >
                    {t("hostCancelLobby")}
                </Button>
                <Button
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white font-bold text-xl px-12 py-8 rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all"
                    onClick={startGame}
                    disabled={players.length === 0}
                >
                    {t("hostStartGame")} <Play className="ml-3 h-6 w-6 fill-current" />
                </Button>
            </div>

            <AlertDialog open={isCancelLobbyDialogOpen} onOpenChange={setIsCancelLobbyDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("hostEndLobbyTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("hostEndLobbyDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("hostKeepLobby")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault()
                                handleCancelLobby()
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {t("hostEndLobby")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={isNegamonIdentityStartDialogOpen}
                onOpenChange={setIsNegamonIdentityStartDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("hostNegamonIdentityStartTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("hostNegamonIdentityStartDesc", {
                                linked: negamonIdentityStatus?.linked ?? 0,
                                total: negamonIdentityStatus?.total ?? 0,
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("hostNegamonIdentityStartBack")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault()
                                setIsNegamonIdentityStartDialogOpen(false)
                                emitStartGame()
                            }}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {t("hostNegamonIdentityStartAnyway")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
