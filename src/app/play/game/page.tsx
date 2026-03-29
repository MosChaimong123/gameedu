"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useSocket } from "@/components/providers/socket-provider"
import { QuestionCard } from "@/components/game/gold-quest/question-card"
import { GameHeader } from "@/components/game/gold-quest/game-header"
import { InteractionNotification } from "@/components/game/gold-quest/interaction-notification"
import { CryptoHackPlayer, GoldQuestPlayer, GameSettings, HackTask, CryptoReward } from "@/lib/types/game"
import { GoldQuestClient } from "@/components/game/gold-quest/gold-quest-client"
import { CryptoHackClient } from "@/components/game/crypto-hack/crypto-hack-client"
import { TaskOverlay } from "@/components/game/crypto-hack/task-overlay"

import { cn } from "@/lib/utils"
import { clearPlayerSession, getPlayerReconnectToken, getPlayerSession, savePlayerSession } from "@/lib/player-session"

type GameView = "LOBBY" | "QUESTION" | "FEEDBACK" | "CHEST" | "GAME_OVER" | "PASSWORD_SELECTION" | "ACTION_CHOICE" | "HACK_TARGET" | "HACK_GUESS" | "BOX_SELECTION";

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

type PlayerMode = "GOLD_QUEST" | "CRYPTO_HACK"
type PlayerState = GoldQuestPlayer | CryptoHackPlayer

type GameStartedPayload = {
    startTime: number
    settings: GameSettings
    gameMode?: PlayerMode
    timeLimit?: number
}

type GameStateUpdatePayload = {
    players: PlayerState[]
    hackState?: "PASSWORD_SELECTION" | "HACKING" | "ENDED"
    passwordOptions?: string[]
}

type JoinedSuccessPayload = {
    pin: string
    nickname: string
    reconnectToken?: string
    gameMode?: PlayerMode
}

function createInitialPlayer(name: string): GoldQuestPlayer {
    return {
        id: "me",
        name,
        gold: 0,
        multiplier: 1,
        streak: 0,
        isConnected: true,
        score: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
    }
}

function isCryptoHackPlayer(player: PlayerState): player is CryptoHackPlayer {
    return "crypto" in player
}

function toGoldQuestPlayer(player: PlayerState): GoldQuestPlayer {
    if (isCryptoHackPlayer(player)) {
        return {
            gold: player.crypto,
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            isConnected: player.isConnected,
            score: player.score,
            correctAnswers: player.correctAnswers,
            incorrectAnswers: player.incorrectAnswers,
            responses: player.responses,
            multiplier: 1,
            streak: 0,
        }
    }

    return player
}

function getPlayerScoreValue(player: PlayerState, mode: PlayerMode): number {
    return mode === "CRYPTO_HACK" && isCryptoHackPlayer(player) ? player.crypto : toGoldQuestPlayer(player).gold
}

export default function PlayerGamePage() {
    const router = useRouter()
    const { socket } = useSocket()
    const { play, stopBGM } = useSound()
    const initialPlayerSession = getPlayerSession()
    // Game State
    const [view, setView] = useState<GameView>("QUESTION")
    const [gameMode, setGameMode] = useState<PlayerMode>("GOLD_QUEST")
    const gameModeRef = useRef<PlayerMode>("GOLD_QUEST")

    // Use union type for player state. Initialize with safe defaults.
    const [player, setPlayer] = useState<PlayerState>(createInitialPlayer(initialPlayerSession?.name ?? "Player"))

    // Question State
    const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null)
    const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)

    // Interaction / Chest State
    const [otherPlayers, setOtherPlayers] = useState<PlayerState[]>([])
    const [notification, setNotification] = useState<{ message: string, type: "SWAP" | "STEAL" | "generic" } | null>(null)

    // Timer & Settings State
    const [endTime, setEndTime] = useState<number | null>(null)
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)
    const [currentTask, setCurrentTask] = useState<HackTask | null>(null)
    const [passwordOptions, setPasswordOptions] = useState<string[]>([])
    const [hackHint, setHackHint] = useState<string | null>(null)
    const [boxReveal, setBoxReveal] = useState<{ index: number, reward: CryptoReward } | null>(null)
    const [hackResult, setHackResult] = useState<{ success: boolean; amount?: number; targetName: string } | null>(null);

    // Timer refs
    const navigationTimer = useRef<NodeJS.Timeout | null>(null)
    const hasRequestedFirstQuestion = useRef(false);

    useEffect(() => {
        // Mode Ref Sync
        gameModeRef.current = gameMode
    }, [gameMode])

    useEffect(() => {
        // Start Game Music
        play("bgm-gold-quest", { volume: 0.3 })

        return () => stopBGM()
    }, [play, stopBGM])

    useEffect(() => {
        // ... (existing session check) ...
        const playerSession = getPlayerSession()

        if (!playerSession) {
            router.push("/play")
            return
        }

        if (!socket) return

        const reconnectToken = getPlayerReconnectToken(playerSession.pin, playerSession.name)

        // Re-join game on mount to handle refreshes
        socket.emit("join-game", { pin: playerSession.pin, nickname: playerSession.name, reconnectToken: reconnectToken ?? undefined })

        // Explicitly request current game state
        socket.emit("get-game-state", { pin: playerSession.pin })

        // --- Socket Listeners ---

        socket.on("game-started", (data: GameStartedPayload) => {
            console.log("CLIENT RECEIVED GAME START:", data);

            // Ensure music is playing if reconnected
            play("bgm-gold-quest", { volume: 0.3 })

            setGameSettings(data.settings)

            // CRITICAL: Update Game Mode immediately if provided
            if (data.gameMode) {
                console.log("Setting Game Mode from start payload:", data.gameMode);
                setGameMode(data.gameMode);
                gameModeRef.current = data.gameMode; // Force sync ref immediately for next check
            }

            // Request first question logic MOVED to game-state-update to ensure correct mode detection
            // even if server doesn't send gameMode in game-started payload.
            console.log("Game started. Waiting for state update to confirm mode and request question...");

            // ... (timer logic) ...
            if (data.settings?.winCondition === "TIME" && data.startTime && data.settings.timeLimitMinutes) {
                const end = data.startTime + (data.settings.timeLimitMinutes * 60 * 1000)
                setEndTime(end)
            } else if (data.settings?.winCondition === "GOLD") {
                setEndTime(null) // No timer in gold mode
            } else if (data.startTime && data.timeLimit) {
                const end = data.startTime + (data.timeLimit * 1000)
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
                    } else if (gameModeRef.current === "CRYPTO_HACK") {
                        console.log("Skipping CHEST nav because mode is CRYPTO_HACK. Waiting for choose-box...");
                        // Do not navigate. "choose-box" event will drive the view change.
                        // If it fails, user stays on Feedback, which is better than Chest.
                    }
                    navigationTimer.current = null;
                }, 1500)
            } else {
                setTimeout(() => {
                    const pin = playerSession.pin
                    if (pin) socket.emit("request-question", { pin })
                }, 2000)
            }
        })

        // ... (gold update listener) ...





        socket.on("game-state-update", (data: GameStateUpdatePayload) => {
            const others = data.players.filter((p) => p.name !== playerSession.name)
            setOtherPlayers(others)

            const { hackState, passwordOptions } = data

            const me = data.players.find((p) => p.name === playerSession.name)
            const isCrypto = me ? isCryptoHackPlayer(me) : false
            const newMode: PlayerMode = isCrypto ? "CRYPTO_HACK" : "GOLD_QUEST"

            // Sync Game Mode
            if (me && gameModeRef.current !== newMode) {
                console.log(`Switching Game Mode: ${gameModeRef.current} -> ${newMode}`);
                setGameMode(newMode);
                gameModeRef.current = newMode;
            }

            // Sync Password Options
            if (passwordOptions && passwordOptions.length > 0) {
                // Hot-fix: Override stale server options on client side
                let opts = passwordOptions.length < 10 ? [
                    "Bitcoin", "Ethereum", "Dogecoin", "Solana", "Cardano",
                    "Ripple", "Binance", "Tether", "Polkadot", "Litecoin",
                    "Chainlink", "Stellar", "Monero", "Tron", "Cosmos",
                    "Tezos", "IOTA", "Neo", "Dash", "Zcash",
                    "Maker", "Aave", "Uniswap", "Sushi", "Compound",
                    "Curve", "Yearn", "Polygon", "Avalanche", "Terra",
                    "Algorand", "VeChain", "Filecoin", "Sandbox", "Decentraland",
                    "Axie", "Theta", "Fantom", "Quant", "Hedera",
                    "Near", "Flow", "EOS", "TrueUSD", "Zilliqa",
                    "Harmony", "Elrond", "Enjin", "Chiliz", "Kusama"
                ] : passwordOptions;

                // Client-Side Filter: Remove passwords taken by others to ensure uniqueness
                if (data.players && Array.isArray(data.players)) {
                    const taken = new Set(data.players
                        .flatMap((p) => isCryptoHackPlayer(p) && p.password ? [p.password] : []))

                    opts = opts.filter((p: string) => !taken.has(p));
                }

                setPasswordOptions(opts);
            }

            // --- Game Logic & View Transitions ---

            if (newMode === "GOLD_QUEST") {
                // Gold Quest Logic
                if (!hasRequestedFirstQuestion.current) {
                    const pin = playerSession.pin;
                    if (pin) {
                        console.log("Requesting initial question for GOLD_QUEST.");
                        socket.emit("request-question", { pin });
                        hasRequestedFirstQuestion.current = true;
                    }
                }
            } else if (newMode === "CRYPTO_HACK") {
                // Crypto Hack Logic
                if (hackState === "PASSWORD_SELECTION") {
                    // Enforce View
                    if (view !== "PASSWORD_SELECTION") {
                        console.log("Enforcing PASSWORD_SELECTION view");
                        setView("PASSWORD_SELECTION");
                    }
                    hasRequestedFirstQuestion.current = true; // Prevent question request
                } else if (hackState === "HACKING") {
                    // Late join to Hacking Phase/Refresh
                    if (!hasRequestedFirstQuestion.current) {
                        console.log("Late join in HACKING phase. Force Update.");

                        // If we are in LOBBY, move to QUESTION immediately (or let choose-box handle it)
                        if (view === "LOBBY") {
                            setView("QUESTION");
                        }

                        const pin = playerSession.pin;
                        if (pin) socket.emit("request-question", { pin });
                        hasRequestedFirstQuestion.current = true;
                    }
                }
            }

            // Stats Update
            const sorted = [...data.players].sort((a, b) => getPlayerScoreValue(b, newMode) - getPlayerScoreValue(a, newMode));

                const rank = sorted.findIndex(p => p.name === playerSession.name) + 1;

            if (me) {
                setPlayer(prev => ({
                    ...prev,
                    ...me,
                    score: rank
                }));
                if ('isGlitched' in me) {
                    const hackMe = me as CryptoHackPlayer;
                    setCurrentTask(hackMe.currentTask || null);
                }
            }
        });

        socket.on("interaction-effect", (data: { source: string; target: string; type: "SWAP" | "STEAL" }) => {
            if (data.target === playerSession.name) {
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
            console.log("Setting Game Mode to CRYPTO_HACK via choose-password");
            // Force mode update to ensure view renders
            setGameMode("CRYPTO_HACK");
            gameModeRef.current = "CRYPTO_HACK";

            // Hot-fix: Override stale server options on client side
            const opts = data.options.length < 10 ? [
                "Bitcoin", "Ethereum", "Dogecoin", "Solana", "Cardano",
                "Ripple", "Binance", "Tether", "Polkadot", "Litecoin",
                "Chainlink", "Stellar", "Monero", "Tron", "Cosmos",
                "Tezos", "IOTA", "Neo", "Dash", "Zcash",
                "Maker", "Aave", "Uniswap", "Sushi", "Compound",
                "Curve", "Yearn", "Polygon", "Avalanche", "Terra",
                "Algorand", "VeChain", "Filecoin", "Sandbox", "Decentraland",
                "Axie", "Theta", "Fantom", "Quant", "Hedera",
                "Near", "Flow", "EOS", "TrueUSD", "Zilliqa",
                "Harmony", "Elrond", "Enjin", "Chiliz", "Kusama"
            ] : data.options;

            setPasswordOptions(opts);
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
            play(data.reward.type === "HACK" ? "chest-open" : "correct");

            if (data.reward.type === "HACK") {
                setTimeout(() => setView("HACK_TARGET"), 2000);
            } else {
                setPlayer(prev => ({ ...prev, crypto: data.newTotal }));

                setTimeout(() => {
                    setBoxReveal(null);
                    setView("QUESTION");
                    const pin = playerSession.pin
                    if (pin) socket.emit("request-question", { pin });
                }, 2000);
            }
        });

        socket.on("hack-result", (data: { success: boolean, amount?: number, targetName: string }) => {
            // Using boxReveal state to piggyback the UI or add a new one?
            // Let's add a specialized state for HackResult to avoid conflict
            setHackResult(data);

            setTimeout(() => {
                setHackResult(null);
                setView("QUESTION");
                const pin = playerSession.pin;
                if (pin) socket.emit("request-question", { pin });
            }, 3000);
        });

        socket.on("selection-error", () => {
            console.log("Selection error, returning to question.");
            setView("QUESTION");
            const pin = playerSession.pin
            if (pin) socket.emit("request-question", { pin });
        });


        socket.on("game-over", (data: { players: GoldQuestPlayer[] }) => {
            stopBGM()
            play("game-over")

            const me = data.players.find((p) => p.name === playerSession.name)
            if (me) {
                const rank = data.players.findIndex(p => p.name === playerSession.name) + 1;
                setPlayer(prev => ({ ...prev, gold: me.gold, score: rank }))
            }
            setView("GAME_OVER")
        })



        socket.on("game-phase-change", (data: { phase: string }) => {
            if (data.phase === "HACKING") {
                // Start questions
                socket.emit("request-question", { pin: playerSession.pin });
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

        socket.on("joined-success", (data: JoinedSuccessPayload) => {
            console.log("Joined success. Server says Mode:", data?.gameMode);

            if (data?.reconnectToken) {
                savePlayerSession({
                    pin: data.pin,
                    name: data.nickname,
                    reconnectToken: data.reconnectToken,
                })
            }

            if (data?.gameMode) {
                setGameMode(data.gameMode);
                gameModeRef.current = data.gameMode;
            }

            // Only request question for Gold Quest
            const pin = playerSession.pin
            if (pin && gameModeRef.current === "GOLD_QUEST") {
                socket.emit("request-question", { pin });
            } else {
                console.log("Waiting for game logic based on mode:", gameModeRef.current);
            }
        });

        // Initial Question Request - REMOVED to avoid race condition
        // socket.emit("request-question", { pin })

        return () => {
            socket.off("joined-success");
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
    }, [socket, router, play, stopBGM, view]);

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
        const pin = getPlayerSession()?.pin;
        socket.emit("submit-answer", {
            pin,
            questionId: currentQuestion.id,
            answerIndex: index
        })
    }

    return (
        <div className="flex flex-col h-screen bg-slate-900 overflow-hidden text-white font-sans">
            {/* Audio Toggle - Moved to bottom right to avoid header overlap */}
            <SoundController className="absolute bottom-4 right-16 z-50" />

            {/* Notification Container */}
            {notification && (
                <InteractionNotification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="flex-1 w-full h-full relative">
                {/* Connection Status - Moved to bottom right to avoid header overlap */}
                <div className="absolute bottom-4 right-4 z-50">
                    <div className={cn(
                        "w-3 h-3 rounded-full shadow-md transition-colors",
                        socket?.connected ? "bg-green-500" : "bg-red-500 animate-pulse"
                    )} title={socket?.connected ? "Connected" : "Disconnected"} />
                </div>

                {/* Leave Button */}
                <button
                    onClick={() => {
                        const currentPlayerSession = getPlayerSession();
                        if (socket && currentPlayerSession?.pin) {
                            socket.emit("leave-game", { pin: currentPlayerSession.pin });
                        }
                        clearPlayerSession();
                        window.location.href = "/play";
                    }}
                    className="absolute bottom-4 left-4 z-50 bg-red-600/80 hover:bg-red-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                >
                    LEAVE GAME
                </button>

                {/* Shared Views */}
                {view === "QUESTION" && currentQuestion && (
                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                        <div className="w-full absolute top-0 left-0 z-20">
                            {gameMode === "GOLD_QUEST" ? (
                                <GameHeader
                                    player={player as GoldQuestPlayer}
                                    endTime={endTime}
                                    goldGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                                />
                            ) : (
                                // Basic placeholder for CryptoHack if needed, or reuse GameHeader with different styling
                                <GameHeader
                                    player={toGoldQuestPlayer(player)}
                                    endTime={endTime}
                                    goldGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                                />
                            )}
                        </div>
                        <div className="flex-1 w-full flex items-center justify-center p-4 pt-16">
                            <QuestionCard
                                question={currentQuestion}
                                onAnswer={handleAnswer}
                            />
                        </div>
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

                {/* Glitch / Task Overlay */}
                {currentTask && (
                    <TaskOverlay
                        task={currentTask}
                        onComplete={() => {
                            // Optimistic clear
                            setCurrentTask(null);
                            if (socket) socket.emit("task-complete", { pin: getPlayerSession()?.pin });
                        }}
                    />
                )}

                {/* Game Mode Specific Clients */}
                {gameMode === "GOLD_QUEST" && view === "CHEST" && (
                    <GoldQuestClient
                        socket={socket}
                        player={player as GoldQuestPlayer}
                        otherPlayers={otherPlayers.filter((other): other is GoldQuestPlayer => !isCryptoHackPlayer(other))}
                        onNavigate={(v) => {
                            setView(v as GameView)
                            if (v === "QUESTION") {
                                const pin = getPlayerSession()?.pin;
                                if (pin && socket) socket.emit("request-question", { pin });
                            }
                        }}
                    />
                )}

                {gameMode === "CRYPTO_HACK" && (view === "PASSWORD_SELECTION" || view === "BOX_SELECTION" || view === "HACK_TARGET" || view === "HACK_GUESS") && (
                    <CryptoHackClient
                        socket={socket}
                        player={player as CryptoHackPlayer}
                        otherPlayers={otherPlayers.filter(isCryptoHackPlayer)}
                        onNavigate={(v) => setView(v as GameView)}
                        view={view}
                        setView={(nextView) => setView(nextView as GameView)}
                        endTime={endTime}
                        cryptoGoal={gameSettings?.winCondition === "GOLD" ? gameSettings.goldGoal : undefined}
                        // Connect Missing State
                        passwordOptions={passwordOptions}
                        hackHint={hackHint}
                        hackResult={hackResult}
                        boxReveal={boxReveal}
                    />
                )}


                {/* Background */}
                <div className="absolute inset-0 -z-10 bg-[url('https://media.blooket.com/image/upload/v1613002626/Backgrounds/goldQuest.jpg')] bg-cover bg-center opacity-20 pointer-events-none" />
            </div>
        </div>
    )
}
