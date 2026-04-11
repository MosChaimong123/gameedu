"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_STUDENT_LOGIN_CODE_LENGTH = exports.STUDENT_LOGIN_CODE_LENGTH = exports.LEGACY_STUDENT_LOGIN_CODE_LENGTH = void 0;
exports.getStudentLoginCodeVariants = getStudentLoginCodeVariants;
exports.generateStudentLoginCode = generateStudentLoginCode;
const crypto_1 = require("crypto");
const LOGIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
exports.LEGACY_STUDENT_LOGIN_CODE_LENGTH = 6;
exports.STUDENT_LOGIN_CODE_LENGTH = 12;
exports.MAX_STUDENT_LOGIN_CODE_LENGTH = 32;
function getStudentLoginCodeVariants(loginCode) {
    const trimmedCode = loginCode.trim();
    return [...new Set([trimmedCode, trimmedCode.toUpperCase(), trimmedCode.toLowerCase()].filter(Boolean))];
}
function generateStudentLoginCode(length = exports.STUDENT_LOGIN_CODE_LENGTH) {
    const bytes = (0, crypto_1.randomBytes)(length);
    return Array.from(bytes, (byte) => LOGIN_CODE_ALPHABET[byte % LOGIN_CODE_ALPHABET.length]).join("");
}
