"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSocket } from "@/components/providers/socket-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowRight, Gamepad2 } from "lucide-react"

export default function PlayPage() {
    const router = useRouter()
    const { socket, isConnected } = useSocket()

    const [pin, setPin] = useState("")
    const [name, setName] = useState("")
    const [joining, setJoining] = useState(false)
    const [error, setError] = useState("")

    const handleJoin = () => {
        if (!socket || !isConnected) {
            setError("Connection lost. Retrying...")
            return
        }
        if (!pin || !name) {
            setError("Please fill in all fields.")
            return
        }

        setJoining(true)
        setError("")

        socket.emit("join-game", { pin, nickname: name })

        // Listen for one-time response
        socket.once("joined-success", (data: any) => {
            // Save info to local storage or state management? 
            // For now, simpler: pass via URL or just assume session context?
            // Actually, best to store in localStorage or Context so /play/lobby knows who we are.
            sessionStorage.setItem("game_pin", data.pin)
            sessionStorage.setItem("player_name", data.nickname)
            router.push("/play/lobby")
        })

        socket.once("error", (err: any) => {
            setError(err.message || "Failed to join")
            setJoining(false)
        })
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-600 to-blue-600 p-4">
            <Card className="w-full max-w-md shadow-2xl border-none">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Gamepad2 className="h-8 w-8 text-purple-600" />
                    </div>
                    <CardTitle className="text-3xl font-black text-slate-900">Join Game</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Game ID (PIN)"
                            className="text-center text-lg h-12 font-bold tracking-widest uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                        />
                        <Input
                            placeholder="Nickname"
                            className="text-center text-lg h-12 font-bold"
                            maxLength={15}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded animate-in shake">
                            {error}
                        </p>
                    )}

                    <Button
                        className="w-full h-12 text-lg font-bold bg-green-500 hover:bg-green-600 shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all"
                        onClick={handleJoin}
                        disabled={joining || !isConnected}
                    >
                        {joining ? <Loader2 className="animate-spin" /> : <>Enter <ArrowRight className="ml-2 w-5 h-5" /></>}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
