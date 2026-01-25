"use client"

import { useSound } from "@/hooks/use-sound"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SoundControllerProps {
    className?: string
    variant?: "default" | "icon" | "ghost"
}

export function SoundController({ className, variant = "default" }: SoundControllerProps) {
    const { isMuted, toggleMute } = useSound()

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className={cn("rounded-full hover:bg-white/20 text-white transition-colors relative z-50", className)}
            title={isMuted ? "Unmute" : "Mute"}
        >
            {isMuted ? (
                <VolumeX className="w-6 h-6" />
            ) : (
                <Volume2 className="w-6 h-6" />
            )}
        </Button>
    )
}
