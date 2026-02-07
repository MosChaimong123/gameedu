import { useState, useEffect } from "react";
// Force Rebuild
import { Socket } from "socket.io-client";
import { CryptoHackPlayer, CryptoReward, HackTask } from "@/lib/types/game";
import { CryptoHackGameHeader } from "./game-header";
import { CryptoBoxSelection } from "./box-selection";
import { useSound } from "@/hooks/use-sound";

type Props = {
    socket: Socket | null;
    player: CryptoHackPlayer;
    otherPlayers: CryptoHackPlayer[]; // or generic Player[] casted
    onNavigate: (view: string) => void;
    // We might need to pass down initial view or sync it
    view: string;
    setView: (view: any) => void; // Parent controls view? Or local?
    // Analysis: page.tsx controls global view state usually.
    // But CryptoHack has its own internal flow (Password -> Box -> Hack).
    // Let's accept props but maybe manage some local transitions.
    endTime: number | null;
    cryptoGoal?: number;
    passwordOptions: string[];
    hackHint: string | null;
    hackResult: { success: boolean; amount?: number; targetName: string } | null;
    boxReveal: { index: number, reward: CryptoReward } | null;
}

export function CryptoHackClient({ socket, player, otherPlayers, onNavigate, view, setView, endTime, cryptoGoal, passwordOptions, hackHint, hackResult, boxReveal }: Props) {
    const { play } = useSound();

    const [isWaiting, setIsWaiting] = useState(false);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;
    }, [socket]);

    // Handlers
    const handleSelectPassword = (pwd: string) => {
        if (!socket) return;
        setIsWaiting(true);
        const pin = sessionStorage.getItem("game_pin");
        socket.emit("select-password", { pin, password: pwd });
    };

    const handleSelectBox = (index: number) => {
        console.log("CryptoHackClient: handleSelectBox called with index:", index);
        const pin = sessionStorage.getItem("game_pin");
        if (!socket) {
            console.error("CryptoHackClient: Socket is null!");
            return;
        }
        console.log("CryptoHackClient: Emitting select-box", { index, pin });
        socket.emit("select-box", { index, pin });
    }

    const handleRequestHack = (targetId: string) => {
        const pin = sessionStorage.getItem("game_pin");
        socket?.emit("request-hack-options", { pin, targetId });
    }

    const handleAttemptHack = (pwd: string) => {
        const pin = sessionStorage.getItem("game_pin");
        const targetId = sessionStorage.getItem("hack_target_id");
        socket?.emit("attempt-hack", { pin, targetId, passwordGuess: pwd });
    }



    return (
        <div className="flex flex-col h-full w-full bg-black font-mono text-green-400 relative overflow-hidden">
            {/* Cyberpunk Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: "linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)",
                backgroundSize: "20px 20px"
            }} />
            <div className="absolute inset-0 opacity-10 bg-[url('https://media.istockphoto.com/id/1130691526/vector/scanlines-vector-grunge-texture-overlay.jpg?s=612x612&w=0&k=20&c=6c0-6d0-6d0-6d0')] pointer-events-none" />

            {/* Header */}
            <CryptoHackGameHeader
                player={player}
                endTime={endTime}
                cryptoGoal={cryptoGoal}
            />

            <div className="flex-1 overflow-y-auto relative p-4 flex flex-col items-center justify-center z-10">
                {/* Views */}
                {view === "PASSWORD_SELECTION" && (
                    <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto h-full animate-in zoom-in-95 duration-300">
                        {(isWaiting || (player.password && player.password !== "")) ? (
                            <div className="text-center space-y-8 animate-in fade-in duration-500">
                                <div className="inline-block p-8 border-4 border-green-500/50 bg-green-950/30 backdrop-blur-md rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-progress-indeterminate" />
                                    <h2 className="text-3xl md:text-5xl font-black text-green-400 uppercase tracking-widest mb-4 glow-text">
                                        PASSWORD LOCKED
                                    </h2>
                                    <div className="text-xl text-green-600 font-mono tracking-[0.5em] animate-pulse mb-6">
                                        [ * * * * * * ]
                                    </div>
                                    <div className="flex items-center justify-center gap-3 text-green-400/80">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" />
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce delay-100" />
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce delay-200" />
                                    </div>
                                    <p className="mt-4 text-green-700 font-bold uppercase tracking-widest text-sm">Waiting for other nodes...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full w-full max-h-full">
                                <div className="mb-4 text-center shrink-0">
                                    <h1 className="text-3xl md:text-5xl font-black text-green-500 mb-2 uppercase tracking-tighter glitch-text">
                                        INITIALIZE DEFENSE
                                    </h1>
                                    <p className="text-green-800 text-sm md:text-lg uppercase tracking-[0.5em] animate-pulse">
                                        &gt; SELECT_PASSWORD_PROTOCOL
                                    </p>
                                </div>

                                <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full pb-8">
                                        {passwordOptions?.map(pwd => (
                                            <button
                                                key={pwd}
                                                onClick={() => handleSelectPassword(pwd)}
                                                className="group relative bg-black border border-green-900 hover:border-green-400 hover:bg-green-900/40 text-green-600 hover:text-green-300 font-bold text-sm md:text-base py-4 px-2 rounded-sm transition-all hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <span className="relative z-10 uppercase tracking-wider truncate block w-full">{pwd}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {passwordOptions.length === 0 && (
                                    <div className="text-green-900 animate-pulse mt-8 font-mono text-center shrink-0">
                                        [ CONNECTING_TO_MAINFRAME... ]
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {view === "BOX_SELECTION" && (
                    <CryptoBoxSelection onSelect={handleSelectBox} reveal={boxReveal} />
                )}

                {view === "HACK_TARGET" && (
                    <div className="w-full max-w-6xl mx-auto flex flex-col items-center h-full">
                        <div className="mb-6 text-center shrink-0">
                            <h1 className="text-3xl md:text-5xl font-black text-red-500 mb-2 uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                TARGET ACQUISITION
                            </h1>
                            <p className="text-red-900 text-sm md:text-lg uppercase tracking-[0.3em] animate-pulse">
                                &gt; SELECT_VICTIM_NODE
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto w-full px-4 custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full pb-8">
                                {otherPlayers?.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleRequestHack(p.id)}
                                        className="group relative bg-black/80 border border-red-900/50 hover:border-red-500 hover:bg-red-950/30 p-4 transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] text-left min-h-[100px] flex flex-col justify-center"
                                    >
                                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-600/50 rounded-full animate-ping" />
                                        <div className="text-red-400 font-bold text-lg truncate mb-1 group-hover:text-white transition-colors w-full">
                                            {p.name}
                                        </div>
                                        <div className="text-xs text-red-800 font-mono">
                                            ₿ {p.crypto ? p.crypto.toLocaleString() : 0}
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => onNavigate("QUESTION")}
                            className="mt-4 mb-4 text-slate-500 hover:text-white hover:bg-slate-800 px-6 py-2 rounded uppercase text-xs tracking-widest transition-colors border border-transparent hover:border-slate-600 shrink-0"
                        >
                            [ ABORT_SEQUENCE ]
                        </button>
                    </div>
                )}

                {view === "HACK_GUESS" && (
                    <PasswordGuessView
                        passwordOptions={passwordOptions}
                        hackHint={hackHint}
                        handleAttemptHack={handleAttemptHack}
                    />
                )}
            </div>

            {/* Hack Result Overlay */}
            {hackResult && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 animate-in fade-in duration-300">
                    <div className={`p-8 rounded-2xl border-4 ${hackResult.success ? "border-green-500 bg-green-950/50" : "border-red-500 bg-red-950/50"} max-w-lg w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] transform scale-100`}>
                        <h2 className={`text-6xl font-black mb-4 uppercase tracking-tighter ${hackResult.success ? "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]" : "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]"}`}>
                            {hackResult.success ? "ACCESS GRANTED" : "ACCESS DENIED"}
                        </h2>
                        <div className={`text-2xl font-bold mb-6 ${hackResult.success ? "text-green-200" : "text-red-200"}`}>
                            {hackResult.success
                                ? `Successfully drained ₿${hackResult.amount?.toLocaleString()} from ${hackResult.targetName}`
                                : `Firewall detected! ${hackResult.targetName} blocked your attempt.`
                            }
                        </div>
                        {hackResult.success && (
                            <div className="animate-bounce text-green-400 text-4xl mt-4">
                                ₿ +{hackResult.amount?.toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Styles for Minigames */}
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes progress-indeterminate {
                    0% { left: -100%; width: 50%; }
                    50% { left: 100%; width: 50%; }
                }
                .animate-progress-indeterminate {
                    animation: progress-indeterminate 1.5s infinite linear;
                }
                @keyframes spin-in-3 {
                    0% { transform: rotate(-180deg) scale(0); opacity: 0; }
                    100% { transform: rotate(0) scale(1); opacity: 1; }
                }
                .spin-in-3 {
                    animation: spin-in-3 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
        </div>
    )
}

function PasswordGuessView({ passwordOptions, hackHint, handleAttemptHack }: { passwordOptions: string[], hackHint: string | null, handleAttemptHack: (pwd: string) => void }) {
    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-5 h-full">
            <div className="mb-4 text-center shrink-0">
                <h1 className="text-3xl md:text-5xl font-black text-blue-500 mb-2 uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                    BRUTE FORCE
                </h1>
                <div className="text-blue-900 text-sm md:text-lg uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                    <span>&gt; CRACKING_PASSWORD...</span>
                    <span className="w-2 h-4 bg-blue-500 animate-pulse" />
                </div>
            </div>

            {hackHint && (
                <div className="bg-blue-950/30 text-blue-300 px-8 py-4 mb-4 border-l-4 border-blue-500 w-full max-w-xl backdrop-blur-sm relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10" />
                    <div className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-widest">Decrypted Fragment</div>
                    <span className="font-mono font-black text-3xl tracking-[0.5em] text-white glow-text truncate block">
                        {hackHint}
                        <span className="text-blue-800 opacity-50">*****</span>
                    </span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto w-full px-4 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full pb-8">
                    {passwordOptions?.map(pwd => (
                        <button
                            key={pwd}
                            onClick={() => handleAttemptHack(pwd)}
                            className="bg-black/80 hover:bg-blue-900/40 border border-blue-900 hover:border-blue-400 text-blue-400 hover:text-blue-100 font-bold py-3 px-2 text-sm md:text-base transition-all shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] uppercase tracking-wider relative overflow-hidden group rounded-sm truncate"
                        >
                            <div className="absolute inset-0 bg-blue-400/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10 block truncate">&gt; {pwd}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
