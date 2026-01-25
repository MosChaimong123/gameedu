"use client"

import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from "react"

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
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
    const bgmRef = useRef<HTMLAudioElement | null>(null)
    const [isMuted, setIsMuted] = useState(false)

    useEffect(() => {
        // Load mute state
        const savedMute = localStorage.getItem("gamedu-muted")
        if (savedMute) {
            setIsMuted(savedMute === "true")
        }

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

    const play = (key: SoundKey, options?: SoundOptions) => {
        if (isMuted && !key.startsWith("bgm-")) return

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
            audio.volume = options?.volume ?? 0.3
            audio.muted = isMuted
            bgmRef.current = audio
            audio.play().catch(e => console.warn("Audio play failed:", e))
            return
        }

        // Handle SFX
        const audio = audioRefs.current.get(key)
        if (audio) {
            const clone = audio.cloneNode() as HTMLAudioElement
            clone.volume = options?.volume ?? 0.5
            clone.play().catch(e => console.warn("SFX play failed:", e))
        } else {
            const newAudio = new Audio(SOUNDS[key])
            newAudio.volume = options?.volume ?? 0.5
            newAudio.play().catch(e => console.warn("SFX play failed:", e))
        }
    }

    const stopBGM = () => {
        if (bgmRef.current) {
            bgmRef.current.pause()
            bgmRef.current = null
        }
    }

    const toggleMute = () => {
        setIsMuted(prev => {
            const newState = !prev
            localStorage.setItem("gamedu-muted", String(newState))
            return newState
        })
    }

    const contextValue = useMemo(() => ({
        play,
        stopBGM,
        toggleMute,
        isMuted
    }), [isMuted])

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
