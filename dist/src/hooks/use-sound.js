"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundProvider = SoundProvider;
exports.useSound = useSound;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = require("next-auth/react");
const accessibility_provider_1 = require("@/components/providers/accessibility-provider");
const user_settings_1 = require("@/lib/user-settings");
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
};
const SoundContext = (0, react_1.createContext)(undefined);
function SoundProvider({ children }) {
    const { data: session } = (0, react_2.useSession)();
    const { reducedSound } = (0, accessibility_provider_1.useAccessibility)();
    const audioRefs = (0, react_1.useRef)(new Map());
    const bgmRef = (0, react_1.useRef)(null);
    // Keep first SSR/client render deterministic; hydrate persisted mute state after mount.
    const [isMuted, setIsMuted] = (0, react_1.useState)(false);
    const userSettings = (0, react_1.useMemo)(() => { var _a; return (0, user_settings_1.parseUserSettings)((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.settings); }, [session === null || session === void 0 ? void 0 : session.user]);
    const effectiveBgmVolume = (0, react_1.useMemo)(() => {
        if (userSettings.bgmEnabled === false)
            return 0;
        return reducedSound ? 0.16 : 0.3;
    }, [reducedSound, userSettings.bgmEnabled]);
    const effectiveSfxVolume = (0, react_1.useMemo)(() => {
        if (userSettings.sfxEnabled === false)
            return 0;
        return reducedSound ? 0.22 : 0.5;
    }, [reducedSound, userSettings.sfxEnabled]);
    (0, react_1.useEffect)(() => {
        if (typeof window === "undefined")
            return;
        setIsMuted(localStorage.getItem("gamedu-muted") === "true");
    }, []);
    (0, react_1.useEffect)(() => {
        // Preload SFX
        Object.entries(SOUNDS).forEach(([key, src]) => {
            if (!key.startsWith("bgm-")) {
                const audio = new Audio(src);
                audio.volume = 0.5;
                audioRefs.current.set(key, audio);
            }
        });
    }, []);
    (0, react_1.useEffect)(() => {
        if (bgmRef.current) {
            bgmRef.current.muted = isMuted;
        }
    }, [isMuted]);
    (0, react_1.useEffect)(() => {
        if (!bgmRef.current)
            return;
        bgmRef.current.volume = effectiveBgmVolume;
        bgmRef.current.muted = isMuted || effectiveBgmVolume <= 0;
    }, [effectiveBgmVolume, isMuted]);
    const play = (0, react_1.useCallback)((key, options) => {
        var _a, _b;
        if (key.startsWith("bgm-")) {
            if (isMuted || effectiveBgmVolume <= 0)
                return;
        }
        else {
            if (isMuted || effectiveSfxVolume <= 0)
                return;
        }
        // Handle BGM
        if (key.startsWith("bgm-")) {
            if (bgmRef.current) {
                if (bgmRef.current.src.includes(SOUNDS[key])) {
                    if (bgmRef.current.paused && !isMuted)
                        bgmRef.current.play().catch(() => { });
                    return;
                }
                bgmRef.current.pause();
                bgmRef.current = null;
            }
            const audio = new Audio(SOUNDS[key]);
            audio.loop = true;
            audio.volume = Math.min((_a = options === null || options === void 0 ? void 0 : options.volume) !== null && _a !== void 0 ? _a : effectiveBgmVolume, effectiveBgmVolume);
            audio.muted = isMuted;
            bgmRef.current = audio;
            audio.play().catch(e => console.warn("Audio play failed:", e));
            return;
        }
        // Handle SFX
        const audio = audioRefs.current.get(key);
        const targetVolume = Math.min((_b = options === null || options === void 0 ? void 0 : options.volume) !== null && _b !== void 0 ? _b : effectiveSfxVolume, effectiveSfxVolume);
        if (reducedSound && audio && !audio.paused) {
            return;
        }
        if (audio) {
            const clone = audio.cloneNode();
            clone.volume = targetVolume;
            clone.play().catch(e => console.warn("SFX play failed:", e));
        }
        else {
            const newAudio = new Audio(SOUNDS[key]);
            newAudio.volume = targetVolume;
            newAudio.play().catch(e => console.warn("SFX play failed:", e));
        }
    }, [effectiveBgmVolume, effectiveSfxVolume, isMuted, reducedSound]);
    const stopBGM = (0, react_1.useCallback)(() => {
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current = null;
        }
    }, []);
    const toggleMute = (0, react_1.useCallback)(() => {
        setIsMuted(prev => {
            const newState = !prev;
            localStorage.setItem("gamedu-muted", String(newState));
            return newState;
        });
    }, []);
    const contextValue = (0, react_1.useMemo)(() => ({
        play,
        stopBGM,
        toggleMute,
        isMuted,
        effectiveBgmVolume,
        effectiveSfxVolume
    }), [effectiveBgmVolume, effectiveSfxVolume, isMuted, play, stopBGM, toggleMute]);
    return ((0, jsx_runtime_1.jsx)(SoundContext.Provider, { value: contextValue, children: children }));
}
function useSound() {
    const context = (0, react_1.useContext)(SoundContext);
    if (context === undefined) {
        throw new Error("useSound must be used within a SoundProvider");
    }
    return context;
}
