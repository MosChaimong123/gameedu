"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBattleAccessibility = useBattleAccessibility;
const accessibility_provider_1 = require("@/components/providers/accessibility-provider");
function useBattleAccessibility() {
    const { reducedMotion, reducedSound, toggleReducedMotion, toggleReducedSound, } = (0, accessibility_provider_1.useAccessibility)();
    return {
        reducedMotion,
        reducedSound,
        toggleReducedMotion,
        toggleReducedSound,
    };
}
