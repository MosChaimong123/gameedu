"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSocket } from "@/components/providers/socket-provider"
import { User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SoundController } from "@/components/game/sound-controller"
import { useSound } from "@/hooks/use-sound"
import { clearPlayerSession, getPlayerSession } from "@/lib/player-session"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/components/providers/language-provider"

export default function PlayerLobbyPage() {
    const router = useRouter()
    const { socket } = useSocket()
    const { play, stopBGM } = useSound()
    const { toast } = useToast()
    const { t, language } = useLanguage()
    const initialPlayerSession = getPlayerSession()

    const [name] = useState<string | null>(initialPlayerSession?.name ?? null)
    const [pin] = useState<string | null>(initialPlayerSession?.pin ?? null)
    const [avatarSeed] = useState(() => Math.floor(Math.random() * 1000)); // For random avatar

    useEffect(() => {
        // Play Lobby Music
        play("bgm-lobby", { volume: 0.3 })

        return () => stopBGM()
    }, [play, stopBGM])

    useEffect(() => {
        // Retrieve session
        const playerSession = getPlayerSession()

        if (!playerSession) {
            router.push("/play")
            return
        }

        if (socket) {
            socket.emit("join-game", {
                pin: playerSession.pin,
                nickname: playerSession.name,
                reconnectToken: playerSession.reconnectToken,
            })
            console.log("Lobby: Requesting game state for", playerSession.pin);
            socket.emit("get-game-state", { pin: playerSession.pin });
        }

        // Listen for game start
        if (socket) {
            socket.on("game-started", () => {
                stopBGM() // Stop lobby music
                router.push("/play/game")
            })

            socket.on("host-disconnected", () => {
                toast({
                    title: t("playLobbyHostDisconnectedTitle"),
                    description: t("playLobbyHostDisconnectedDesc"),
                    variant: "destructive",
                })
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
    }, [router, socket, stopBGM, toast, language, t])

    if (!name) return null

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 p-4 text-white sm:p-6">
            {/* Audio Toggle */}
            {/* Audio Toggle */}
            <SoundController className="absolute top-4 right-4" />

            {/* Background Decorations */}
            <div className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full overflow-hidden opacity-25">
                <div className="absolute left-10 top-10 h-32 w-32 animate-pulse rounded-full bg-indigo-500 blur-3xl" />
                <div className="absolute bottom-10 right-10 h-48 w-48 animate-pulse rounded-full bg-violet-600 blur-3xl delay-1000" />
            </div>

            <div className="z-10 flex flex-col items-center space-y-8 animate-in zoom-in-90 duration-500">
                <div className="text-center space-y-2">
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-400">{t("playLobbyWaitingHost")}</p>
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
                        {t("playLobbyPinPrefix")} {pin}
                    </div>
                </div>

                <p className="text-slate-500 text-sm max-w-xs text-center">{t("playLobbyWaitBody")}</p>

                <button
                    onClick={() => {
                        if (socket && pin) {
                            socket.emit("leave-game", { pin });
                        }
                        clearPlayerSession()
                        router.push("/play");
                    }}
                    className="text-red-500 hover:text-red-400 text-sm font-bold hover:underline transition-colors"
                >
                    {t("playLobbyLeaveGame")}
                </button>
            </div>
        </div>
    )
}
