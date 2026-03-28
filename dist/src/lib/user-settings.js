"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USER_SETTINGS = void 0;
exports.parseUserSettings = parseUserSettings;
exports.DEFAULT_USER_SETTINGS = {
    theme: "light",
    language: "th",
    sfxEnabled: true,
    bgmEnabled: true,
    accessibility: {
        reducedMotion: false,
        reducedSound: false,
    },
};
function parseUserSettings(settings) {
    var _a;
    if (!settings || typeof settings !== "object") {
        return exports.DEFAULT_USER_SETTINGS;
    }
    const value = settings;
    return {
        ...exports.DEFAULT_USER_SETTINGS,
        ...value,
        accessibility: {
            ...exports.DEFAULT_USER_SETTINGS.accessibility,
            ...((_a = value.accessibility) !== null && _a !== void 0 ? _a : {}),
        },
    };
}
