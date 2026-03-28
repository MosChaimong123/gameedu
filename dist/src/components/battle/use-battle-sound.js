"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBattleSound = useBattleSound;
const react_1 = require("react");
const use_sound_1 = require("@/hooks/use-sound");
function getContext(audioContextRef) {
    if (audioContextRef.current)
        return audioContextRef.current;
    if (typeof window === "undefined")
        return null;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor)
        return null;
    const context = new AudioContextCtor();
    audioContextRef.current = context;
    return context;
}
function playToneSequence(audioContextRef, notes) {
    const context = getContext(audioContextRef);
    if (!context)
        return;
    const startTime = Math.max(context.currentTime, context.currentTime + 0.01);
    if (context.state === "suspended") {
        void context.resume().catch(() => { });
    }
    notes.forEach((note) => {
        var _a, _b;
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const noteStart = startTime + ((_a = note.delay) !== null && _a !== void 0 ? _a : 0);
        const noteEnd = noteStart + note.duration;
        oscillator.type = (_b = note.type) !== null && _b !== void 0 ? _b : "sine";
        oscillator.frequency.setValueAtTime(note.frequency, noteStart);
        gainNode.gain.setValueAtTime(0.0001, noteStart);
        gainNode.gain.exponentialRampToValueAtTime(Math.max(note.gain, 0.0001), noteStart + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.02);
    });
}
function playSkillCue(audioContextRef, event) {
    switch (event.fxPreset) {
        case "arcane":
            playToneSequence(audioContextRef, [
                { frequency: 420, duration: 0.11, gain: 0.045, type: "triangle" },
                { frequency: 630, duration: 0.16, gain: 0.04, delay: 0.05, type: "triangle" },
            ]);
            break;
        case "poison":
            playToneSequence(audioContextRef, [
                { frequency: 170, duration: 0.18, gain: 0.05, type: "sawtooth" },
                { frequency: 145, duration: 0.2, gain: 0.04, delay: 0.06, type: "triangle" },
            ]);
            break;
        case "thunder":
            playToneSequence(audioContextRef, [
                { frequency: 860, duration: 0.08, gain: 0.06, type: "square" },
                { frequency: 430, duration: 0.16, gain: 0.05, delay: 0.04, type: "sawtooth" },
            ]);
            break;
        case "heal":
            playToneSequence(audioContextRef, [
                { frequency: 520, duration: 0.1, gain: 0.04, type: "sine" },
                { frequency: 780, duration: 0.18, gain: 0.045, delay: 0.05, type: "sine" },
            ]);
            break;
        case "shield":
            playToneSequence(audioContextRef, [
                { frequency: 260, duration: 0.14, gain: 0.05, type: "triangle" },
                { frequency: 390, duration: 0.16, gain: 0.04, delay: 0.05, type: "triangle" },
            ]);
            break;
        case "buff":
            playToneSequence(audioContextRef, [
                { frequency: 480, duration: 0.08, gain: 0.04, type: "sine" },
                { frequency: 620, duration: 0.14, gain: 0.04, delay: 0.04, type: "sine" },
            ]);
            break;
        case "debuff":
            playToneSequence(audioContextRef, [
                { frequency: 310, duration: 0.09, gain: 0.04, type: "square" },
                { frequency: 250, duration: 0.16, gain: 0.04, delay: 0.04, type: "sawtooth" },
            ]);
            break;
        case "ice":
            playToneSequence(audioContextRef, [
                { frequency: 700, duration: 0.08, gain: 0.035, type: "triangle" },
                { frequency: 560, duration: 0.16, gain: 0.032, delay: 0.05, type: "sine" },
            ]);
            break;
        case "pierce":
        case "execute":
            playToneSequence(audioContextRef, [
                { frequency: 280, duration: 0.08, gain: 0.05, type: "sawtooth" },
                { frequency: 180, duration: 0.14, gain: 0.05, delay: 0.05, type: "square" },
            ]);
            break;
        default:
            playToneSequence(audioContextRef, [
                { frequency: 360, duration: 0.08, gain: 0.04, type: "triangle" },
                { frequency: 520, duration: 0.14, gain: 0.035, delay: 0.05, type: "triangle" },
            ]);
            break;
    }
}
function playHitCue(audioContextRef, event) {
    playToneSequence(audioContextRef, [
        {
            frequency: event.correct ? 210 : 180,
            duration: 0.08,
            gain: 0.05,
            type: event.correct ? "square" : "sawtooth",
        },
        {
            frequency: event.correct ? 120 : 95,
            duration: 0.14,
            gain: 0.045,
            delay: 0.03,
            type: "triangle",
        },
    ]);
}
function playResourceCue(audioContextRef, event) {
    if (event.type === "HEAL_APPLIED") {
        playToneSequence(audioContextRef, [
            { frequency: 540, duration: 0.08, gain: 0.04, type: "sine" },
            { frequency: 740, duration: 0.16, gain: 0.045, delay: 0.05, type: "sine" },
        ]);
        return;
    }
    if (event.resourceType === "STAMINA") {
        playToneSequence(audioContextRef, [
            { frequency: 380, duration: 0.07, gain: 0.04, type: "triangle" },
            { frequency: 520, duration: 0.1, gain: 0.035, delay: 0.04, type: "triangle" },
        ]);
        return;
    }
    playToneSequence(audioContextRef, [
        { frequency: 460, duration: 0.08, gain: 0.035, type: "sine" },
        { frequency: 620, duration: 0.12, gain: 0.035, delay: 0.04, type: "sine" },
    ]);
}
function useBattleSound(events, reducedSound = false) {
    const { play, isMuted } = (0, use_sound_1.useSound)();
    const processedRef = (0, react_1.useRef)(0);
    const audioContextRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (processedRef.current >= events.length)
            return;
        const newEvents = events.slice(processedRef.current);
        processedRef.current = events.length;
        if (isMuted)
            return;
        newEvents.forEach((event) => {
            switch (event.type) {
                case "ANSWER_RESULT":
                    play(event.correct ? "correct" : "wrong", { volume: reducedSound ? 0.18 : 0.45 });
                    break;
                case "ACTION_ATTACK":
                    if (reducedSound)
                        break;
                    playToneSequence(audioContextRef, [
                        { frequency: 260, duration: 0.06, gain: 0.045, type: "sawtooth" },
                        { frequency: 210, duration: 0.08, gain: 0.04, delay: 0.03, type: "triangle" },
                    ]);
                    break;
                case "ACTION_SKILL_CAST":
                    if (reducedSound)
                        break;
                    playSkillCue(audioContextRef, event);
                    break;
                case "DAMAGE_APPLIED":
                    if (reducedSound)
                        break;
                    playHitCue(audioContextRef, event);
                    break;
                case "HEAL_APPLIED":
                case "RESOURCE_GAINED":
                    if (reducedSound)
                        break;
                    playResourceCue(audioContextRef, event);
                    break;
                case "ACTION_DEFEND":
                    if (reducedSound)
                        break;
                    playToneSequence(audioContextRef, [
                        { frequency: 240, duration: 0.1, gain: 0.04, type: "triangle" },
                        { frequency: 310, duration: 0.14, gain: 0.035, delay: 0.05, type: "triangle" },
                    ]);
                    break;
                case "UNIT_DEFEATED":
                    play("game-over", { volume: reducedSound ? 0.16 : 0.35 });
                    break;
                default:
                    break;
            }
        });
    }, [events, isMuted, play, reducedSound]);
}
