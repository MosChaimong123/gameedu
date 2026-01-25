"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useSocket } from "@/components/providers/socket-provider"
import { GoldQuestPlayerView } from "@/components/game/gold-quest/player-view"
import { QuestionCard } from "@/components/game/gold-quest/question-card"
import { GameHeader } from "@/components/game/gold-quest/game-header"
import { InteractionNotification } from "@/components/game/gold-quest/interaction-notification"
import { CryptoHackPlayer, GoldQuestPlayer, ChestReward, GameSettings, HackTask, CryptoReward } from "@/lib/types/game"
import { GoldQuestClient } from "@/components/game/gold-quest/gold-quest-client"
import { CryptoHackClient } from "@/components/game/crypto-hack/crypto-hack-client"
import { TaskOverlay } from "@/components/game/crypto-hack/task-overlay"

import { cn } from "@/lib/utils"

type GameView = "QUESTION" | "FEEDBACK" | "CHEST" | "GAME_OVER" | "PASSWORD_SELECTION" | "ACTION_CHOICE" | "HACK_TARGET" | "HACK_GUESS" | "BOX_SELECTION";

type QuestionPayload = {
    id: string;
    question: string;
    options: string[];
    timeLimit: number;
    image?: string;
}

// ... imports
import { useSound } from "@/hooks/use-sound"
import { SoundController } from "@/components/game/sound-controller"

export default function PlayerGamePage() {
    const router = useRouter()
    const { socket } = useSocket()
    const { play, stopBGM, toggleMute, isMuted } = useSound()
    // Game State
    const [view, setView] = useState<GameView>("QUESTION")
    const [gameMode, setGameMode] = useState<"GOLD_QUEST" | "CRYPTO_HACK">("GOLD_QUEST")
    const gameModeRef = useRef<"GOLD_QUEST" | "CRYPTO_HACK">("GOLD_QUEST")

    // Use union type for player state. Initialize with safe defaults.
    const [player, setPlayer] = useState<GoldQuestPlayer | CryptoHackPlayer>({
        id: "me",
        name: "Player",
        gold: 0, // Default for GQ
        crypto: 0, // Default for CH
        multiplier: 1,
        streak: 0,
        isConnected: true,
        score: 0,
        // Crypto specific defaults
        password: "",
        hackChance: 1.0,
        isLocked: false
    } as any)

    // Question State
    const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null)
    const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)

    // Interaction / Chest State
    const [otherPlayers, setOtherPlayers] = useState<GoldQuestPlayer[]>([])
    const [notification, setNotification] = useState<{ message: string, type: "SWAP" | "STEAL" | "generic" } | null>(null)

    // Timer & Settings State
    const [endTime, setEndTime] = useState<number | null>(null)
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)
    const [currentTask, setCurrentTask] = useState<HackTask | null>(null)
    const [passwordOptions, setPasswordOptions] = useState<string[]>([])
    const [hackHint, setHackHint] = useState<string | null>(null)
    const [boxReveal, setBoxReveal] = useState<{ index: number, reward: CryptoReward } | null>(null)

    // Timer refs
    const navigationTimer = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        // Mode Ref Sync
        gameModeRef.current = gameMode
    }, [gameMode])

    useEffect(() => {
        // Start Game Music
        play("bgm-gold-quest", { volume: 0.3 })

        return () => stopBGM()
    }, [])

    useEffect(() => {
        // ... (existing session check) ...
        const name = sessionStorage.getItem("player_name")
        const pin = sessionStorage.getItem("game_pin")

        if (!name || !pin) {
            router.push("/play")
            return
        }
        setPlayer(prev => ({ ...prev, name }))

        if (!socket) return

        // Re-join game on mount to handle refreshes
        socket.emit("join-game", { pin, nickname: name })

        // Explicitly request current game state
        socket.emit("get-game-state", { pin })

        // --- Socket Listeners ---

        socket.on("game-started", (data: { startTime: number, settings: any }) => {
            console.log("CLIENT RECEIVED GAME START:", data);

            // Ensure music is playing if reconnected
            play("bgm-gold-quest", { volume: 0.3 })

            setGameSettings(data.settings)

            // ... (timer logic) ...
            if (data.settings?.winCondition === "TIME" && data.startTime && data.settings.timeLimitMinutes) {
                const end = data.startTime + (data.settings.timeLimitMinutes * 60 * 1000)
                setEndTime(end)
            } else if (data.settings?.winCondition === "GOLD") {
                setEndTime(null) // No timer in gold mode
            } else if (data.startTime && (data as any).timeLimit) {
                const end = data.startTime + ((data as any).timeLimit * 1000)
                setEndTime(end)
            }
        })

        // ... (other listeners) ...

        socket.on("next-question", (q: QuestionPayload) => {
            setCurrentQuestion(q)
            setView("QUESTION")
            setFeedback(null)
        })

        socket.on("answer-result", (res: { correct: boolean }) => {
            setFeedback(res)
            setView("FEEDBACK")

            // SFX
            play(res.correct ? "correct" : "wrong")

            if (res.correct) {
                // Clear any existing timer
                if (navigationTimer.current) clearTimeout(navigationTimer.current);

                navigationTimer.current = setTimeout(() => {
                    console.log("Navigating... Mode:", gameModeRef.current);

                    // Only go to CHEST if Gold Quest
                    if (gameModeRef.current === "GOLD_QUEST") {
                        setView("CHEST")
                    } else {
                        console.log("Skipping CHEST nav because mode is CRYPTO_HACK. Waiting for choose-box...");
                        // Fail-safe: If choose-box doesn't arrive in 2.5s, request it
                        setTimeout(() => {
                            // We can't easily check 'view' here without a ref, but requesting rewards is safe-ish
                            if (gameModeRef.current === "CRYPTO_HACK") {
                                console.log("Requesting missing rewards...");
                                socket.emit("request-rewards", { pin: sessionStorage.getItem("game_pin") });
                            }
                        }, 2500);
                    }
                    navigationTimer.current = null;
                }, 1500)
            } else {
                setTimeout(() => {
                    if (pin) socket.emit("request-question", { pin })
                }, 2000)
            }
        })

        // ... (gold update listener) ...





        socket.on("game-state-update", (data: { players: (GoldQuestPlayer | CryptoHackPlayer)[] }) => {
            const others = data.players.filter(p => p.name !== name)
            setOtherPlayers(others as any[])

            const me = data.players.find(p => p.name === name)
            const isCrypto = me && 'crypto' in me;
            const newMode = isCrypto ? "CRYPTO_HACK" : "GOLD_QUEST";

            if (me && gameModeRef.current !== newMode) {
                setGameMode(newMode);
            }



            const sorted = [...data.players].sort((a: any, b: any) => {
                if (isCrypto) return (b.crypto || 0) - (a.crypto || 0);
                return (b.gold || 0) - (a.gold || 0);
            });

            const rank = sorted.findIndex(p => p.name === name) + 1;

            if (me) {
                setPlayer(prev => ({
                    ...prev,
                    ...me,
                    score: rank
                }));
                // Sync Task/Glitch State
                if ('isGlitched' in me) {
                    const hackMe = me as CryptoHackPlayer;
                    setCurrentTask(hackMe.currentTask || null);
                }
            }

            // Sync Password Options if available (Crucial for reconnects)
            if ((data as any).passwordOptions && (data as any).passwordOptions.length > 0) {
                setPasswordOptions((data as any).passwordOptions);
            }
        })

        socket.on("interaction-effect", (data: { source: string; target: string; type: "SWAP" | "STEAL" }) => {
            if (data.target === name) {
                // SFX for being attacked
                play(data.type === "SWAP" ? "swap" : "steal")

                const msg = data.type === "SWAP"
                    ? `${data.source} swapped gold!`
                    : `${data.source} stole gold!`;

                setNotification({ message: msg, type: data.type });
            }
        })

        socket.on("choose-box", () => {
            console.log("CLIENT RECEIVED CHOOSE-BOX");
            if (navigationTimer.current) clearTimeout(navigationTimer.current);
            setBoxReveal(null); // Ensure clean state
            setView("BOX_SELECTION");
        });

        socket.on("choose-password", (data: { options: string[] }) => {
            setPasswordOptions(data.options);
            setView("PASSWORD_SELECTION");
        });

        socket.on("hack-options", (data: { targetId: string, options: string[], hint?: string }) => {
            sessionStorage.setItem("hack_target_id", data.targetId);
            setPasswordOptions(data.options);
            setHackHint(data.hint || null);
            setView("HACK_GUESS");
        });

        socket.on("box-reveal", (data: { index: number, reward: CryptoReward, newTotal: number }) => {
            setBoxReveal(data);
            play(data.reward.type === "HACK" ? "chest-open" : "coin");

            if (data.reward.type === "HACK") {
                setTimeout(() => setView("HACK_TARGET"), 2000);
            } else {
                setPlayer(prev => ({ ...prev, crypto: data.newTotal }));

                setTimeout(() => {
                    setBoxReveal(null);
                    setView("QUESTION");
                    if (pin) socket.emit("request-question", { pin });
                }, 2000);
            }
        });

        socket.on("hack-result", (data: { success: boolean, amount: number, targetName: string }) => {
            if (data.success) {
                alert(`SUCCESS! Hacked ${data.targetName} for ₿${data.amount}!`);
            } else {
                alert(`FAILED! ${data.targetName} protected their crypto.`);
            }
            setView("QUESTION");
            if (pin) socket.emit("request-question", { pin });
        });

        socket.on("selection-error", () => {
            console.log("Selection error, returning to question.");
            setView("QUESTION");
            if (pin) socket.emit("request-question", { pin });
        });


        socket.on("game-over", (data: { players: GoldQuestPlayer[] }) => {
            stopBGM()
            play("game-over")

            const me = data.players.find(p => p.name === name)
            if (me) {
                const rank = data.players.findIndex(p => p.name === name) + 1;
                setPlayer(prev => ({ ...prev, gold: me.gold, score: rank }))
            }
            setView("GAME_OVER")
        })



        socket.on("game-phase-change", (data: { phase: string }) => {
            if (data.phase === "HACKING") {
                // Start questions
                socket.emit("request-question", { pin: sessionStorage.getItem("game_pin") });
            }
        })

        socket.on("player-hacked", (data: { hacker: string, amount: number, isGlitched: boolean, task?: HackTask }) => {
            play("wrong"); // Or specific glitch sound

            setNotification({
                message: `WARNING: HACKED BY ${data.hacker}! -₿${data.amount}`,
                type: "generic"
            });

            if (data.isGlitched && data.task) {
                // Trigger Glitch UI
                // Small delay to let notification show? Or immediate?
                // Immediate panic is better.
                setCurrentTask(data.task);
            }
        })

        // Initial Question Request
        socket.emit("request-question", { pin })

        return () => {
            socket.off("game-started");
            socket.off("game-phase-change");
            socket.off("next-question");
            socket.off("answer-result");
            socket.off("game-state-update");
            socket.off("interaction-effect");
            socket.off("game-over");
            socket.off("player-hacked");
            socket.off("task-assigned");
            // Crypto Hack Specifics
            socket.off("choose-box");
            socket.off("choose-password");
            socket.off("hack-options");
            socket.off("box-reveal");
            socket.off("hack-result");
            socket.off("selection-error");
        };
    }, [socket, router]);

    // Handle Glitch/Task Events separately or in main effect? 
    // Let's put them in a separate effect to keep it clean or merge above?
    // Merging above requires finding where I cut. 
    // Let's add a dedicated effect for Glitch System to be safe.
    useEffect(() => {
        if (!socket) return;

        const handlePlayerHacked = (data: { hacker: string, amount: number, isGlitched: boolean, task?: HackTask }) => {
            play("wrong");
            setNotification({
                message: `WARNING: HACKED BY ${data.hacker}! -₿${data.amount}`,
                type: "generic"
            });
            if (data.isGlitched && data.task) {
                setCurrentTask(data.task);
            }
        };

        const handleTaskComplete = () => {
            console.log("Task Completed! Clearing glitch.");
            setCurrentTask(null);
            play("correct");
        };

        socket.on("player-hacked", handlePlayerHacked);
        socket.on("task-complete", handleTaskComplete);

        return () => {
            socket.off("player-hacked", handlePlayerHacked);
            socket.off("task-complete", handleTaskComplete);
        }
    }, [socket, play]);

    const handleAnswer = (index: number) => {
        if (!socket || !currentQuestion) return;
        const pin = sessionStorage.getItem("game_pin");
        socket.emit("submit-answer", {
            pin,
            questionId: currentQuestion.id,
            answerIndex: index
        })
    }

    return (
        <div className="flex flex-col h-screen bg-slate-900 overflow-hidden text-white font-sans">
            {/* Audio Toggle */}
            <SoundController className="absolute top-4 right-16 z-50" />

            {/* Notification Container */}
            {notification && (
                <InteractionNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="flex-1 w-full h-full relative">
                {/* Connection Status */}
                <div className="absolute top-4 right-4 z-50">
                    <div className={cn(
                        "w-3 h-3 rounded-full shadow-md transition-colors",
                        socket?.connected ? "bg-green-500" : "bg-red-500 animate-pulse"
                    )} title={socket?.connected ? "Connected" : "Disconnected"} />
                </div>

                {/* Shared Views */}
                {view === "QUESTION" && currentQuestion && (
                    <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                        <QuestionCard
                            question={currentQuestion}
                            onAnswer={handleAnswer}
                        />
                    </div>
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
                            {feedback.correct ? "CORRECT" : "WRONG"}
                        </motion.div>
                        <div className="text-2xl text-slate-300 font-bold bg-slate-800/50 px-6 py-3 rounded-full">
                            {feedback.correct ? "Get ready!" : "Next time..."}
                        </div>
                    </div>
                )}

                {view === "GAME_OVER" && (
                    <div className="flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-90 h-full">
                        <h1 className="text-6xl font-black text-amber-500 mb-8">GAME OVER</h1>
                        <div className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800">
                            <div className="text-xl font-bold uppercase text-slate-400">Final Rank</div>
                            <div className="text-8xl font-black text-slate-800 mb-6">#{player.score}</div>
                            <div className="text-4xl font-black text-amber-600">
                                {gameMode === "CRYPTO_HACK"
                                    ? `₿ ${(player as CryptoHackPlayer).crypto?.toLocaleString()}`
                                    : (player as GoldQuestPlayer).gold?.toLocaleString()
                                }
                            </div>
                        </div>
                        <button onClick={() => router.push("/play")} className="mt-8 bg-slate-700 text-white font-bold py-3 px-8 rounded-full">
                            Back to Menu
                        </button>
                    </div>
                )}

                {/* Game Mode Specific Clients */}
                {gameMode === "GOLD_QUEST" && view === "CHEST" && (
                    <GoldQuestClient
                        socket={socket}
                        player={player as GoldQuestPlayer}
                        otherPlayers={otherPlayers as GoldQuestPlayer[]}
                        onNavigate={setView}
                    />
                )}

                {gameMode === "CRYPTO_HACK" && (view === "PASSWORD_SELECTION" || view === "BOX_SELECTION" || view === "HACK_TARGET" || view === "HACK_GUESS") && (
                    <CryptoHackClient
                        socket={socket}
                        player={player as CryptoHackPlayer}
                        otherPlayers={otherPlayers as CryptoHackPlayer[]} // Casting partial
                        onNavigate={setView}
                        view={view}
                        setView={setView}
                        endTime={endTime}
                        cryptoGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                    />
                )}

                {/* Background */}
                <div className="absolute inset-0 -z-10 bg-[url('https://media.blooket.com/image/upload/v1613002626/Backgrounds/goldQuest.jpg')] bg-cover bg-center opacity-20 pointer-events-none" />
            </div>
        </div>
    )
}
