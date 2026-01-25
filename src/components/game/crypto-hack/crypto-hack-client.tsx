import { useState, useEffect } from "react";
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
    boxReveal: { index: number, reward: CryptoReward } | null;
}

export function CryptoHackClient({ socket, player, otherPlayers, onNavigate, view, setView, endTime, cryptoGoal, passwordOptions, hackHint, boxReveal }: Props) {
    const { play } = useSound();

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        // Only keep Hack Result here if page.tsx doesn't handle it fully?
        // page.tsx handles navigation, but maybe alerts?
        // Actually page.tsx handles alert too?
        // Let's check page.tsx: it handles alert and navigation.
        // So we can remove ALL listeners here if page.tsx handles everything.

        // Let's keep it clean. Remove listeners if page.tsx handles state.

    }, [socket]);

    // Handlers
    const handleSelectPassword = (pwd: string) => {
        if (!socket) return;
        const pin = sessionStorage.getItem("game_pin");
        socket.emit("select-password", { pin, password: pwd });
        alert(`Selected: ${pwd}. Waiting for other players...`);
    };

    const handleSelectBox = (index: number) => {
        const pin = sessionStorage.getItem("game_pin");
        socket?.emit("select-box", { index, pin });
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
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <CryptoHackGameHeader
                player={player}
                endTime={endTime}
                cryptoGoal={cryptoGoal}
            />

            <div className="flex-1 overflow-y-auto relative p-4 flex flex-col items-center justify-center">
                {/* Views */}
                {view === "PASSWORD_SELECTION" && (
                    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto animate-in fade-in">
                        <h1 className="text-4xl font-black text-green-400 mb-8 uppercase text-center">Set Password</h1>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                            {passwordOptions?.map(pwd => (
                                <button
                                    key={pwd}
                                    onClick={() => handleSelectPassword(pwd)}
                                    className="bg-slate-800 hover:bg-green-600 border-2 border-slate-600 hover:border-green-400 text-white font-bold text-xl py-6 rounded-xl shadow-lg transition-all"
                                >
                                    {pwd}
                                </button>
                            ))}
                        </div>
                        {passwordOptions.length === 0 && (
                            <div className="text-slate-400 animate-pulse">Waiting for server...</div>
                        )}
                    </div>
                )}

                {view === "BOX_SELECTION" && (
                    <CryptoBoxSelection onSelect={handleSelectBox} reveal={boxReveal} />
                )}

                {view === "HACK_TARGET" && (
                    <div className="w-full max-w-4xl mx-auto">
                        <h1 className="text-3xl font-black text-red-500 mb-8 text-center uppercase tracking-widest">Select Target</h1>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {otherPlayers?.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleRequestHack(p.id)}
                                    className="bg-slate-900 border-2 border-slate-700 hover:border-red-500 text-white p-6 rounded-xl font-bold text-lg transition-all hover:scale-105"
                                >
                                    {p.name}
                                    <div className="text-xs text-slate-500 mt-1">₿ {p.crypto}</div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => onNavigate("QUESTION")} className="mt-8 text-slate-500 hover:text-white underline w-full text-center">
                            Cancel Hack
                        </button>
                    </div>
                )}

                {view === "HACK_GUESS" && (
                    <div className="w-full max-w-2xl mx-auto">
                        <h1 className="text-3xl font-black text-green-400 mb-8 text-center uppercase">Crack Password</h1>
                        {hackHint && (
                            <div className="bg-blue-900/50 text-blue-200 px-6 py-3 rounded-xl mb-6 border border-blue-500 text-center">
                                HINT: <span className="font-mono font-bold tracking-widest">{hackHint}</span>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            {passwordOptions?.map(pwd => (
                                <button
                                    key={pwd}
                                    onClick={() => handleAttemptHack(pwd)}
                                    className="bg-slate-800 hover:bg-green-600 border-2 border-slate-600 hover:border-green-400 text-white font-bold py-6 rounded-xl text-xl"
                                >
                                    {pwd}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
