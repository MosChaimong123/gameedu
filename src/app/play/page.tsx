"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSocket } from "@/components/providers/socket-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowRight } from "lucide-react"
import { getPlayerReconnectToken, getStoredStudentCode, getStoredStudentId, savePlayerSession } from "@/lib/player-session"
import { PublicBrandMark } from "@/components/layout/public-brand-mark"
import { useLanguage } from "@/components/providers/language-provider"
import { formatSocketErrorMessage } from "@/app/play/game/play-game-types"

type JoinedSuccessPayload = {
    pin: string
    nickname: string
    reconnectToken?: string
    studentId?: string
    studentCode?: string
}

type ErrorPayload = {
    message?: string
}

export default function PlayPage() {
    const router = useRouter()
    const { socket, isConnected } = useSocket()
    const { t } = useLanguage()

    const [pin, setPin] = useState("")
    const [name, setName] = useState("")
    const [studentCode, setStudentCode] = useState(() => getStoredStudentCode())
    const [joining, setJoining] = useState(false)
    const [error, setError] = useState("")

    const classroomCode = studentCode.trim() || getStoredStudentCode() || ""
    const classroomHref = classroomCode ? `/student/${encodeURIComponent(classroomCode)}` : "/student"

    const handleJoin = () => {
        if (!socket || !isConnected) {
            setError(t("playErrorConnectionLost"))
            return
        }
        if (!pin || !name) {
            setError(t("playErrorFillAllFields"))
            return
        }

        setJoining(true)
        setError("")

        const reconnectToken = getPlayerReconnectToken(pin, name)
        const studentId = getStoredStudentId()
        const storedStudentCode = getStoredStudentCode()
        const cleanStudentCode = studentCode.trim()
        const matchingStoredIdentity =
            cleanStudentCode &&
            storedStudentCode &&
            cleanStudentCode.toLowerCase() === storedStudentCode.toLowerCase()

        socket.emit("join-game", {
            pin,
            nickname: name,
            reconnectToken: reconnectToken ?? undefined,
            studentId: matchingStoredIdentity ? studentId || undefined : undefined,
            studentCode: cleanStudentCode || undefined,
        })

        // Listen for one-time response
        socket.once("joined-success", (data: JoinedSuccessPayload) => {
            // Save info to local storage or state management? 
            // For now, simpler: pass via URL or just assume session context?
            // Actually, best to store in localStorage or Context so /play/lobby knows who we are.
            savePlayerSession({
                pin: data.pin,
                name: data.nickname,
                reconnectToken: data.reconnectToken,
                studentId: data.studentId,
                studentCode: data.studentCode,
            })
            router.push("/play/lobby")
        })

        socket.once("error", (err: ErrorPayload) => {
            const raw = typeof err?.message === "string" ? err.message.trim() : ""
            setError(raw ? formatSocketErrorMessage(raw, t) : t("playErrorFailedToJoin"))
            setJoining(false)
        })
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 via-white to-indigo-50/80 px-4 py-8 sm:px-6">
            <div className="mb-8">
                <PublicBrandMark href="/" size="md" />
            </div>
            <Card className="w-full max-w-md border border-slate-200/80 shadow-2xl shadow-indigo-200/40">
                <CardHeader className="pb-2 text-center">
                    <CardTitle className="text-3xl font-black text-slate-900">{t("playJoinTitle")}</CardTitle>
                    <p className="text-sm font-medium text-slate-500">{t("playJoinSubtitle")}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder={t("playPlaceholderPin")}
                            className="text-center text-lg h-12 font-bold tracking-widest uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                        />
                        <Input
                            placeholder={t("playPlaceholderNickname")}
                            className="text-center text-lg h-12 font-bold"
                            maxLength={15}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Input
                            placeholder={t("playPlaceholderStudentCode")}
                            className="text-center text-lg h-12 font-bold tracking-widest uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                            maxLength={32}
                            value={studentCode}
                            onChange={(e) => setStudentCode(e.target.value.trim().toUpperCase())}
                        />
                        <p className="px-1 text-center text-xs font-medium text-slate-400">
                            {t("playStudentCodeHint")}
                        </p>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded animate-in shake">
                            {error}
                        </p>
                    )}

                    <Button
                        className="h-12 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-lg font-bold text-white shadow-md shadow-indigo-200/50 transition-all hover:from-indigo-700 hover:to-purple-700 active:translate-y-0.5"
                        onClick={handleJoin}
                        disabled={joining || !isConnected}
                    >
                        {joining ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                {t("playEnterGame")} <ArrowRight className="ml-2 w-5 h-5" />
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        className="h-11 w-full border-slate-200 bg-white/80 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        asChild
                    >
                        <Link href={classroomHref} prefetch={false}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t("playBackToClassroom")}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
