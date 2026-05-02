"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTranslationText = getTranslationText;
const translations_th_legacy_json_1 = __importDefault(require("@/lib/translations-th-legacy.json"));
const translations_1 = require("@/lib/translations");
const thaiFallback = translations_th_legacy_json_1.default;
const thaiPrimary = translations_1.thaiPack;
function getTranslationText(language, key) {
    var _a, _b, _c, _d;
    const english = translations_1.translations.en[key];
    if (language === "th") {
        return (_c = (_b = (_a = thaiPrimary[key]) !== null && _a !== void 0 ? _a : thaiFallback[key]) !== null && _b !== void 0 ? _b : english) !== null && _c !== void 0 ? _c : key;
    }
    return (_d = english !== null && english !== void 0 ? english : translations_1.translations[language][key]) !== null && _d !== void 0 ? _d : key;
}
