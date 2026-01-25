"use strict";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Lock, Trophy, Wifi, Coins, Fish, Calculator, Zap } from "lucide-react";

type GameMode = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    players: string;
    time: string;
    active: boolean;
};

const MODES: GameMode[] = [
    {
        id: "gold-quest",
        title: "Gold Quest",
        description: "Answer questions to earn gold. Open chests to multiply your fortune or steal from others! Speed and luck are key.",
        icon: <img src="/assets/gold-quest.png" alt="Gold Quest" className="w-full h-full object-contain drop-shadow-xl" />,
        color: "bg-indigo-900 border-amber-400", // Adjusted for better contrast with image
        bgColor: "bg-indigo-950",
        players: "2-60",
        time: "7-10 min",
        active: true
    },
    {
        id: "crypto-hack",
        title: "Crypto Hack",
        description: "Hack your way to the top! Answer questions to mine crypto and steal passwords.",
        icon: <img src="/assets/crypto-hack.png" alt="Crypto Hack" className="w-full h-full object-contain drop-shadow-xl" />,
        color: "bg-green-900 border-green-400",
        bgColor: "bg-green-950",
        players: "2-60",
        time: "10-15 min",
        active: true
    },
    {
        id: "fishing-frenzy",
        title: "Fishing Frenzy",
        description: "Cast your line and reel in big answers! A relaxing yet competitive mode.",
        icon: <img src="/assets/fishing-frenzy.png" alt="Fishing Frenzy" className="w-full h-full object-contain drop-shadow-xl" />,
        color: "bg-blue-900 border-blue-400",
        bgColor: "bg-blue-950",
        players: "2-60",
        time: "5-10 min",
        active: false
    },
    {
        id: "tower-defense",
        title: "Tower Defense",
        description: "Build towers and defend your base while answering questions.",
        icon: <Lock className="w-12 h-12 text-purple-100" />,
        color: "bg-purple-500",
        bgColor: "bg-purple-600",
        players: "1-60",
        time: "15-20 min",
        active: false
    },
    {
        id: "cafe",
        title: "Cafe",
        description: "Serve customers and run your own restaurant.",
        icon: <Coins className="w-12 h-12 text-red-100" />,
        color: "bg-red-500",
        bgColor: "bg-red-600",
        players: "2-60",
        time: "7-12 min",
        active: false
    },
    {
        id: "factory",
        title: "Factory",
        description: "Upgrade your units and build the ultimate factory.",
        icon: <Zap className="w-12 h-12 text-indigo-100" />,
        color: "bg-indigo-500",
        bgColor: "bg-indigo-600",
        players: "2-60",
        time: "10-20 min",
        active: false
    },
    {
        id: "racing",
        title: "Racing",
        description: "Race against opponents by answering quickly!",
        icon: <Calculator className="w-12 h-12 text-orange-100" />,
        color: "bg-orange-500",
        bgColor: "bg-orange-600",
        players: "2-60",
        time: "5-10 min",
        active: false
    }
];

interface GameModeSelectorProps {
    onSelect: (modeId: string) => void;
}

export function GameModeSelector({ onSelect }: GameModeSelectorProps) {
    const [selectedId, setSelectedId] = useState<string>("gold-quest");
    const selectedMode = MODES.find(m => m.id === selectedId) || MODES[0];

    return (
        <div className="min-h-screen bg-[#2c003e] flex flex-row overflow-hidden font-sans">
            {/* Left: Background Pattern & Grid */}
            <div className="flex-1 relative flex flex-col">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: "radial-gradient(#ffffff 2px, transparent 2px)",
                    backgroundSize: "30px 30px"
                }}></div>

                <div className="relative z-10 p-8 flex flex-col h-full">
                    <div className="bg-[#4a1a6b] text-white text-center py-3 rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] mb-8">
                        <h1 className="text-3xl font-black tracking-wide drop-shadow-md">Select Game Mode</h1>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20 custom-scrollbar">
                        {MODES.map((mode) => (
                            <div
                                key={mode.id}
                                onClick={() => setSelectedId(mode.id)}
                                className={cn(
                                    "aspect-[4/3] rounded-2xl cursor-pointer relative group transition-all duration-200 border-4",
                                    selectedId === mode.id
                                        ? "border-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)] z-10"
                                        : "border-transparent hover:scale-105 hover:z-10 opacity-80 hover:opacity-100"
                                )}
                            >
                                <div className={cn(
                                    "w-full h-full rounded-xl flex flex-col items-center justify-center gap-2 shadow-lg",
                                    mode.color
                                )}>
                                    {mode.icon}
                                    <span className="font-black text-white text-xl text-center leading-tight drop-shadow-md px-2">
                                        {mode.title}
                                    </span>
                                    {!mode.active && (
                                        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                                            <div className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full border border-slate-600 flex items-center gap-1 shadow-xl">
                                                <Lock className="w-3 h-3" /> Coming Soon
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Details Sidebar */}
            <div className="w-[400px] bg-white relative shadow-2xl flex flex-col z-20">
                {/* Mode Preview Image/Icon Area */}
                <div className={cn(
                    "h-64 flex items-center justify-center flex-col gap-4 p-8 relative overflow-hidden",
                    selectedMode.bgColor
                )}>
                    {/* Background deco */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                    <div className="relative z-10 transform scale-150">
                        {selectedMode.icon}
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-4xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]">
                            {selectedMode.title}
                        </h2>
                    </div>
                </div>

                {/* Details Content */}
                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex gap-4 mb-6">
                        {/* ... */}
                    </div>

                    <p className="text-slate-600 text-lg leading-relaxed font-medium mb-8">
                        {selectedMode.description}
                    </p>

                    <div className="mt-auto">
                        <Button
                            size="lg"
                            className="w-full text-2xl font-bold py-8 rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all"
                            disabled={!selectedMode.active}
                            onClick={() => {
                                console.log("Host Game button clicked for:", selectedMode.id);
                                onSelect(selectedMode.id);
                            }}
                        >
                            {selectedMode.active ? "Host Game" : "Coming Soon"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
