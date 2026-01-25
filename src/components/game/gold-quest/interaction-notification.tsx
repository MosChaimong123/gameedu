import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { ArrowRightLeft, Banknote } from "lucide-react"

type Props = {
    message: string
    type: "SWAP" | "STEAL" | "generic"
    onClose: () => void
}

export function InteractionNotification({ message, type, onClose }: Props) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onClose, 300) // Wait for exit animation
        }, 3000)
        return () => clearTimeout(timer)
    }, [onClose])

    const getIcon = () => {
        if (type === "SWAP") return <ArrowRightLeft className="w-12 h-12 text-blue-500" />
        if (type === "STEAL") return <Banknote className="w-12 h-12 text-green-500" />
        return null
    }

    const getBgColor = () => {
        if (type === "SWAP") return "bg-blue-100 border-blue-500 text-blue-900"
        if (type === "STEAL") return "bg-red-100 border-red-500 text-red-900" // Steal acts against you, so red warning
        return "bg-slate-100 border-slate-500 text-slate-900"
    }

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-start justify-center pt-24 pointer-events-none transition-all duration-500",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-12"
        )}>
            <div className={cn(
                "relative bg-white border-b-8 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 flex flex-col items-center text-center gap-4 pointer-events-auto transform transition-transform",
                isVisible ? "scale-100" : "scale-90",
                getBgColor()
            )}>
                <div className="bg-white p-4 rounded-full shadow-md border-4 border-current">
                    {getIcon()}
                </div>
                <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-wider">{type === "SWAP" ? "SWAPPED!" : type === "STEAL" ? "STOLEN!" : "ALERT"}</h3>
                    <p className="font-bold text-lg leading-tight opacity-90">{message}</p>
                </div>
            </div>
        </div>
    )
}
