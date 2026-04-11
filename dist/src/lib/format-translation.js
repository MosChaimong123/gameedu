"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTranslation = formatTranslation;
const translations_1 = require("@/lib/translations");
/** Server-safe `t()` using the shared dictionary (defaults to English for DB fallback text). */
function formatTranslation(language, key, params) {
    var _a;
    let text = (_a = translations_1.translations[language][key]) !== null && _a !== void 0 ? _a : key;
    if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
            text = text.replace(`{${paramKey}}`, String(value));
        });
    }
    return text;
}
