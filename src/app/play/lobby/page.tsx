"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSocket } from "@/components/providers/socket-provider"
import { Loader2, User, Volume2, VolumeX } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SoundController } from "@/components/game/sound-controller"
import { useSound } from "@/hooks/use-sound"

export default function PlayerLobbyPage() {
    const router = useRouter()
    const { socket } = useSocket()
    const { play, stopBGM, toggleMute, isMuted } = useSound()

    const [name, setName] = useState<string | null>(null)
    const [pin, setPin] = useState<string | null>(null)
    const [avatarSeed, setAvatarSeed] = useState(0); // For random avatar

    useEffect(() => {
        // Play Lobby Music
        play("bgm-lobby", { volume: 0.3 })

        return () => stopBGM()
    }, [])

    useEffect(() => {
        // Retrieve session
        const storedName = sessionStorage.getItem("player_name")
        const storedPin = sessionStorage.getItem("game_pin")

        if (!storedName || !storedPin) {
            router.push("/play")
            return
        }

        setName(storedName)
        setPin(storedPin)
        setAvatarSeed(Math.floor(Math.random() * 1000))

        if (socket && storedPin) {
            console.log("Lobby: Requesting game state for", storedPin);
            socket.emit("get-game-state", { pin: storedPin });
        }

        // Listen for game start
        if (socket) {
            socket.on("game-started", () => {
                stopBGM() // Stop lobby music
                router.push("/play/game")
            })

            socket.on("host-disconnected", () => {
                alert("Host disconnected")
                router.push("/play")
            })

            socket.on("game-over", () => {
                stopBGM()
                router.push("/play/game")
            })
        }

        return () => {
            if (socket) {
                socket.off("game-started")
                socket.off("host-disconnected")
            }
        }
    }, [router, socket])

    if (!name) return null

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4 relative overflow-hidden">
            {/* Audio Toggle */}
            {/* Audio Toggle */}
            <SoundController className="absolute top-4 right-4" />

            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
                <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-48 h-48 bg-blue-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="z-10 flex flex-col items-center space-y-8 animate-in zoom-in-90 duration-500">
                <div className="text-center space-y-2">
                    <p className="text-slate-400 font-medium">WAITING FOR HOST</p>
                    <div className="flex items-center justify-center space-x-2">
                        <span className="h-3 w-3 bg-green-500 rounded-full animate-bounce"></span>
                        <span className="h-3 w-3 bg-green-500 rounded-full animate-bounce delay-100"></span>
                        <span className="h-3 w-3 bg-green-500 rounded-full animate-bounce delay-200"></span>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <Avatar className="h-32 w-32 border-4 border-slate-800 shadow-xl relative">
                        <AvatarImage src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${name + avatarSeed}`} />
                        <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
                    </Avatar>
                </div>

                <div className="text-center">
                    <h1 className="text-4xl font-black tracking-tight">{name}</h1>
                    <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm text-slate-400">
                        PIN: {pin}
                    </div>
                </div>

                <p className="text-slate-500 text-sm max-w-xs text-center">
                    You're in! wait for the host to start the game.
                </p>

                <button
                    onClick={() => {
                        if (socket && pin) {
                            socket.emit("leave-game", { pin });
                        }
                        sessionStorage.clear();
                        router.push("/play");
                    }}
                    className="text-red-500 hover:text-red-400 text-sm font-bold hover:underline transition-colors"
                >
                    Leave Game
                </button>
            </div>
        </div>
    )
}
