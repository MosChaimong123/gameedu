"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTranslation = formatTranslation;
const translation_lookup_1 = require("@/lib/translation-lookup");
/** Server-safe `t()` using the shared dictionary (defaults to English for DB fallback text). */
function formatTranslation(language, key, params) {
    let text = (0, translation_lookup_1.getTranslationText)(language, key);
    if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
            text = text.replace(`{${paramKey}}`, String(value));
        });
    }
    return text;
}
