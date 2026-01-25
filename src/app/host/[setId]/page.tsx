"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSocket } from "@/components/providers/socket-provider"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Users, Copy, Loader2, Play } from "lucide-react"
import { GameModeSelector } from "@/components/host/game-mode-selector"
import { GoldQuestSettings } from "@/components/host/settings/gold-quest-settings"
import { CryptoHackSettings } from "@/components/host/settings/crypto-hack-settings"
import { GoldQuestHostView } from "@/components/game/gold-quest/host-view"
import { CryptoHackHostView } from "@/components/game/crypto-hack/host-view"
import { GoldQuestPlayer, CryptoHackPlayer, GameSettings } from "@/lib/types/game"
import { cn } from "@/lib/utils"

import { useSound } from "@/hooks/use-sound"
import { SoundController } from "@/components/game/sound-controller"

export default function HostLobbyPage() {
    const params = useParams()
    const setId = params.setId as string
    const { socket, isConnected } = useSocket()
    const { data: session } = useSession()
    const { play, stopBGM, toggleMute, isMuted } = useSound()
    const router = useRouter()

    const [pin, setPin] = useState<string | null>(null)
    const [players, setPlayers] = useState<(GoldQuestPlayer | CryptoHackPlayer)[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<"SELECT_MODE" | "SETTINGS" | "LOBBY" | "PLAYING" | "ENDED">("SELECT_MODE")
    const [gameEvents, setGameEvents] = useState<any[]>([])
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)
    const [selectedMode, setSelectedMode] = useState<"GOLD_QUEST" | "CRYPTO_HACK">("GOLD_QUEST")

    // Timer State
    const [timeLeft, setTimeLeft] = useState(0)
    const [endTime, setEndTime] = useState<number | null>(null)

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
    }, [view]) // Re-run when view changes

    useEffect(() => {
        if (!socket || !isConnected || !session?.user) return;

        // ... (rest of existing effect) ...
        const savedPin = sessionStorage.getItem(`host_pin_${setId}`)

        if (savedPin) {
            console.log("Attempting to reconnect as host:", savedPin);
            // Re-join existing room
            socket.emit("join-game", { pin: savedPin, nickname: "HOST" })
            setPin(savedPin)
            setLoading(false)
            // View update will trigger BGM change
            setView("LOBBY") // Or PLAYING if server tells us
        } else {
            // New Session: Wait for user to select mode
            setLoading(false)
            if (view === "SELECT_MODE") {
                // Do nothing, just show selector
            }
        }

        // Listeners
        socket.on("game-created", (data: { pin: string }) => {
            setPin(data.pin)
            sessionStorage.setItem(`host_pin_${setId}`, data.pin)
            setLoading(false)
            setView("LOBBY")
        })

        socket.on("player-joined", (data: { players: (GoldQuestPlayer | CryptoHackPlayer)[] }) => {
            console.log("Host Received Players Update:", data.players);
            setPlayers(data.players)
        })

        // Listen for game start
        socket.on("game-started", (data: { startTime: number, settings: any, mode?: "GOLD_QUEST" | "CRYPTO_HACK" }) => {
            console.log("Game Started Data:", data);
            setView("PLAYING")

            if (data.mode) setSelectedMode(data.mode);
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
            } else if (data.startTime && (data as any).timeLimit) {
                // Fallback for legacy
                const end = data.startTime + ((data as any).timeLimit * 1000)
                setEndTime(end)
                setTimeLeft((data as any).timeLimit)
            } else {
                // Final Fallback
                console.warn("Missing timer data, using fallback");
                const limit = 420;
                setTimeLeft(limit)
                setEndTime(Date.now() + (limit * 1000))
            }
        })

        socket.on("game-state-update", (data: { players: (GoldQuestPlayer | CryptoHackPlayer)[] }) => {
            setPlayers(data.players)
        })

        socket.on("interaction-effect", (event: any) => {
            setGameEvents(prev => [...prev, event])
            if (event.type === "SWAP") play("swap")
            if (event.type === "STEAL") play("steal")
        })

        socket.on("game-over", () => {
            setView("ENDED");
            setEndTime(null);
            sessionStorage.removeItem(`host_pin_${setId}`);
        })

        socket.on("error", (err: { message: string }) => {
            console.error("Socket Error:", err);
            if (err.message === "Game not found" || err.message === "Game is locked") {
                // Clear invalid session and retry
                sessionStorage.removeItem(`host_pin_${setId}`);
                window.location.reload();
            }
        })

        return () => {
            stopBGM() // Stop on unmount
            socket.off("game-created")
            socket.off("player-joined")
            socket.off("game-started")
            socket.off("game-state-update")
            socket.off("interaction-effect")
            socket.off("game-over")
            socket.off("error")
        }
    }, [socket, isConnected, session, setId])

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

    const handleSelectMode = (modeId: string) => {
        console.log("handleSelectMode called with:", modeId);
        if (modeId === "gold-quest") {
            setSelectedMode("GOLD_QUEST");
            setView("SETTINGS");
        } else if (modeId === "crypto-hack") {
            setSelectedMode("CRYPTO_HACK");
            setView("SETTINGS");
        }
        // Handle other modes later
    }

    const handleHostGame = (settings: GameSettings) => {
        if (socket && session?.user) {
            setLoading(true)
            socket.emit("create-game", {
                setId,
                hostId: session.user.id,
                settings,
                mode: selectedMode
            })
        }
    }

    const startGame = () => {
        // Emit start game event (Phase 4)
        if (socket) {
            socket.emit("start-game", { pin });
            setView("PLAYING"); // Optimistic update
        }
    }

    if (!session) return <div className="p-8 text-center">Please login to host.</div>

    if (loading) return <div className="flex h-screen items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="text-slate-500">Loading...</p>
    </div>

    if (view === "SELECT_MODE") {
        // Audio Toggle
        return <>
            <SoundController className="fixed top-4 right-4" />
            <GameModeSelector onSelect={handleSelectMode} />
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
                <GoldQuestSettings onHost={handleHostGame} onBack={() => setView("SELECT_MODE")} />
            </>
        )
    }

    // ... (keep handleEndGame) ...
    const handleEndGame = () => {
        if (socket && pin) {
            socket.emit("end-game", { pin });
        }
    }

    // Render Game View if Playing
    // Render Game View if Playing
    if (view === "PLAYING") {
        if (selectedMode === "CRYPTO_HACK") {
            return <>
                <SoundController className="fixed top-4 right-4" />
                <CryptoHackHostView
                    players={players as CryptoHackPlayer[]}
                    events={gameEvents}
                    timeLeft={timeLeft}
                    onEndGame={handleEndGame}
                    cryptoGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                    pin={pin || ""}
                />
            </>
        }
        return <>
            <SoundController className="fixed top-4 right-4" />
            <GoldQuestHostView
                players={players as GoldQuestPlayer[]}
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
                <h1 className="text-6xl font-black text-amber-500 mb-8 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">GAME OVER</h1>

                <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-2xl border-4 border-slate-700 shadow-2xl mb-8">
                    <h2 className="text-2xl font-bold text-center mb-6 uppercase tracking-widest text-slate-400">Final Standings</h2>
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
                                    {("crypto" in player) ?
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
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl px-12 py-6 rounded-full shadow-[0_4px_0_rgb(107,33,168)] active:translate-y-1 transition-all"
                >
                    Back to My Question Sets
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            <SoundController className="fixed top-6 right-6" />

            {/* Top Bar */}
            <div className="p-6 flex justify-between items-center border-b border-slate-800">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Blooket Clone
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
                    <p className="text-slate-400 uppercase tracking-widest text-sm font-semibold">Join with Game Code</p>
                    <div className="relative group cursor-pointer" onClick={copyPin}>
                        <h1 className="text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                            {pin}
                        </h1>
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-6 w-6 text-slate-500" />
                        </div>
                    </div>
                    <p className="text-slate-500">Go to <span className="text-purple-400 font-bold">gameedu-app.onrender.com/play</span></p>
                </div>

                {/* Player Grid */}
                <div className="w-full max-w-5xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {players.map((player) => (
                            <Card key={player.id} className="bg-slate-800 border-none p-4 flex items-center justify-center animate-in scale-0 duration-300 fill-mode-both">
                                <span className="font-bold text-lg text-white truncate">{player.name}</span>
                            </Card>
                        ))}
                    </div>
                    {players.length === 0 && (
                        <div className="text-center text-slate-600 mt-12 animate-pulse">
                            Waiting for players to join...
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
                    onClick={() => {
                        if (confirm("End this game and return to menu?")) {
                            handleEndGame();
                            sessionStorage.removeItem(`host_pin_${setId}`);
                            setPin(null);
                            setPlayers([]);
                            setView("SELECT_MODE");
                        }
                    }}
                >
                    Cancel Lobby
                </Button>
                <Button
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white font-bold text-xl px-12 py-8 rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all"
                    onClick={startGame}
                    disabled={players.length === 0}
                >
                    Start Game <Play className="ml-3 h-6 w-6 fill-current" />
                </Button>
            </div>
        </div>
    )
}
