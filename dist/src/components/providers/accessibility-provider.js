"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessibilityProvider = AccessibilityProvider;
exports.useAccessibility = useAccessibility;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = require("next-auth/react");
const user_settings_1 = require("@/lib/user-settings");
const REDUCED_MOTION_OVERRIDE_KEY = "gamedu-accessibility-reduced-motion";
const REDUCED_SOUND_OVERRIDE_KEY = "gamedu-accessibility-reduced-sound";
const AccessibilityContext = (0, react_1.createContext)(undefined);
function readStoredPreference(key) {
    if (typeof window === "undefined")
        return null;
    const value = localStorage.getItem(key);
    if (value == null)
        return null;
    return value === "true";
}
function persistStoredPreference(key, value) {
    if (typeof window === "undefined")
        return;
    localStorage.setItem(key, String(value));
}
function AccessibilityProvider({ children }) {
    var _a, _b, _c, _d, _e, _f;
    const { data: session } = (0, react_2.useSession)();
    const saveTimerRef = (0, react_1.useRef)(null);
    const hydratedRef = (0, react_1.useRef)(false);
    const sessionSettings = (0, user_settings_1.parseUserSettings)((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.settings);
    // Keep first SSR/client render deterministic; sync browser preferences after mount.
    const [motionOverride, setMotionOverride] = (0, react_1.useState)(null);
    const [soundOverride, setSoundOverride] = (0, react_1.useState)(null);
    const [prefersReducedMotion, setPrefersReducedMotion] = (0, react_1.useState)(false);
    const reducedMotion = (_c = motionOverride !== null && motionOverride !== void 0 ? motionOverride : (_b = sessionSettings.accessibility) === null || _b === void 0 ? void 0 : _b.reducedMotion) !== null && _c !== void 0 ? _c : prefersReducedMotion;
    const reducedSound = (_e = soundOverride !== null && soundOverride !== void 0 ? soundOverride : (_d = sessionSettings.accessibility) === null || _d === void 0 ? void 0 : _d.reducedSound) !== null && _e !== void 0 ? _e : false;
    (0, react_1.useEffect)(() => {
        var _a, _b;
        hydratedRef.current = true;
        setMotionOverride(readStoredPreference(REDUCED_MOTION_OVERRIDE_KEY));
        setSoundOverride(readStoredPreference(REDUCED_SOUND_OVERRIDE_KEY));
        if (typeof window !== "undefined") {
            setPrefersReducedMotion((_b = (_a = window.matchMedia) === null || _a === void 0 ? void 0 : _a.call(window, "(prefers-reduced-motion: reduce)").matches) !== null && _b !== void 0 ? _b : false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        var _a, _b;
        if (typeof window === "undefined")
            return;
        const media = (_a = window.matchMedia) === null || _a === void 0 ? void 0 : _a.call(window, "(prefers-reduced-motion: reduce)");
        if (!media)
            return;
        const handleChange = (event) => {
            if (motionOverride == null) {
                setPrefersReducedMotion(event.matches);
            }
        };
        (_b = media.addEventListener) === null || _b === void 0 ? void 0 : _b.call(media, "change", handleChange);
        return () => {
            var _a;
            (_a = media.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(media, "change", handleChange);
        };
    }, [motionOverride]);
    (0, react_1.useEffect)(() => {
        if (typeof document === "undefined")
            return;
        document.documentElement.dataset.reducedMotion = reducedMotion ? "true" : "false";
        document.documentElement.dataset.reducedSound = reducedSound ? "true" : "false";
    }, [reducedMotion, reducedSound]);
    (0, react_1.useEffect)(() => {
        var _a;
        if (!hydratedRef.current || !((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return;
        if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = window.setTimeout(() => {
            void fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accessibility: {
                        reducedMotion,
                        reducedSound,
                    },
                }),
            }).catch(() => { });
        }, 300);
        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
            }
        };
    }, [reducedMotion, reducedSound, (_f = session === null || session === void 0 ? void 0 : session.user) === null || _f === void 0 ? void 0 : _f.id]);
    const setReducedMotion = (value) => {
        persistStoredPreference(REDUCED_MOTION_OVERRIDE_KEY, value);
        setMotionOverride(value);
    };
    const setReducedSound = (value) => {
        persistStoredPreference(REDUCED_SOUND_OVERRIDE_KEY, value);
        setSoundOverride(value);
    };
    const value = (0, react_1.useMemo)(() => ({
        reducedMotion,
        reducedSound,
        setReducedMotion,
        setReducedSound,
        toggleReducedMotion: () => setReducedMotion(!reducedMotion),
        toggleReducedSound: () => setReducedSound(!reducedSound),
    }), [reducedMotion, reducedSound]);
    return ((0, jsx_runtime_1.jsx)(AccessibilityContext.Provider, { value: value, children: children }));
}
function useAccessibility() {
    const context = (0, react_1.useContext)(AccessibilityContext);
    if (!context) {
        throw new Error("useAccessibility must be used within AccessibilityProvider");
    }
    return context;
}
