"use client"

import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"

import { useAccessibility } from "@/components/providers/accessibility-provider"
import { parseUserSettings } from "@/lib/user-settings"

const SOUNDS = {
    // BGM
    "bgm-lobby": "/sounds/bgm-lobby.mp3",
    "bgm-gold-quest": "/sounds/bgm-gold-quest.mp3",

    // SFX
    "correct": "/sounds/sfx-correct.mp3",
    "wrong": "/sounds/sfx-wrong.mp3",
    "chest-open": "/sounds/sfx-chest-open.mp3",
    "swap": "/sounds/sfx-swap.mp3",
    "steal": "/sounds/sfx-steal.mp3",
    "game-over": "/sounds/sfx-game-over.mp3",
    "click": "/sounds/sfx-click.mp3"
}

export type SoundKey = keyof typeof SOUNDS

interface SoundOptions {
    volume?: number
    loop?: boolean
}

interface SoundContextType {
    play: (key: SoundKey, options?: SoundOptions) => void
    stopBGM: () => void
    toggleMute: () => void
    isMuted: boolean
    effectiveBgmVolume: number
    effectiveSfxVolume: number
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const { reducedSound } = useAccessibility()
    const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
    const bgmRef = useRef<HTMLAudioElement | null>(null)
    // Keep first SSR/client render deterministic; hydrate persisted mute state after mount.
    const [isMuted, setIsMuted] = useState(false)

    const userSettings = useMemo(
        () => parseUserSettings((session?.user as { settings?: unknown } | undefined)?.settings),
        [session?.user]
    )

    const effectiveBgmVolume = useMemo(() => {
        if (userSettings.bgmEnabled === false) return 0
        return reducedSound ? 0.16 : 0.3
    }, [reducedSound, userSettings.bgmEnabled])

    const effectiveSfxVolume = useMemo(() => {
        if (userSettings.sfxEnabled === false) return 0
        return reducedSound ? 0.22 : 0.5
    }, [reducedSound, userSettings.sfxEnabled])

    useEffect(() => {
        if (typeof window === "undefined") return
        setIsMuted(localStorage.getItem("gamedu-muted") === "true")
    }, [])

    useEffect(() => {
        // Preload SFX
        Object.entries(SOUNDS).forEach(([key, src]) => {
            if (!key.startsWith("bgm-")) {
                const audio = new Audio(src)
                audio.volume = 0.5
                audioRefs.current.set(key, audio)
            }
        })
    }, [])

    useEffect(() => {
        if (bgmRef.current) {
            bgmRef.current.muted = isMuted
        }
    }, [isMuted])

    useEffect(() => {
        if (!bgmRef.current) return
        bgmRef.current.volume = effectiveBgmVolume
        bgmRef.current.muted = isMuted || effectiveBgmVolume <= 0
    }, [effectiveBgmVolume, isMuted])

    const play = useCallback((key: SoundKey, options?: SoundOptions) => {
        if (key.startsWith("bgm-")) {
            if (isMuted || effectiveBgmVolume <= 0) return
        } else {
            if (isMuted || effectiveSfxVolume <= 0) return
        }

        // Handle BGM
        if (key.startsWith("bgm-")) {
            if (bgmRef.current) {
                if (bgmRef.current.src.includes(SOUNDS[key])) {
                    if (bgmRef.current.paused && !isMuted) bgmRef.current.play().catch(() => { })
                    return
                }
                bgmRef.current.pause()
                bgmRef.current = null
            }

            const audio = new Audio(SOUNDS[key])
            audio.loop = true
            audio.volume = Math.min(options?.volume ?? effectiveBgmVolume, effectiveBgmVolume)
            audio.muted = isMuted
            bgmRef.current = audio
            audio.play().catch(e => console.warn("Audio play failed:", e))
            return
        }

        // Handle SFX
        const audio = audioRefs.current.get(key)
        const targetVolume = Math.min(options?.volume ?? effectiveSfxVolume, effectiveSfxVolume)

        if (reducedSound && audio && !audio.paused) {
            return
        }

        if (audio) {
            const clone = audio.cloneNode() as HTMLAudioElement
            clone.volume = targetVolume
            clone.play().catch(e => console.warn("SFX play failed:", e))
        } else {
            const newAudio = new Audio(SOUNDS[key])
            newAudio.volume = targetVolume
            newAudio.play().catch(e => console.warn("SFX play failed:", e))
        }
    }, [effectiveBgmVolume, effectiveSfxVolume, isMuted, reducedSound])

    const stopBGM = useCallback(() => {
        if (bgmRef.current) {
            bgmRef.current.pause()
            bgmRef.current = null
        }
    }, [])

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newState = !prev
            localStorage.setItem("gamedu-muted", String(newState))
            return newState
        })
    }, [])

    const contextValue = useMemo(() => ({
        play,
        stopBGM,
        toggleMute,
        isMuted,
        effectiveBgmVolume,
        effectiveSfxVolume
    }), [effectiveBgmVolume, effectiveSfxVolume, isMuted, play, stopBGM, toggleMute])

    return (
        <SoundContext.Provider value= { contextValue } >
        { children }
        </SoundContext.Provider>
    )
}

export function useSound() {
    const context = useContext(SoundContext)
    if (context === undefined) {
        throw new Error("useSound must be used within a SoundProvider")
    }
    return context
}
