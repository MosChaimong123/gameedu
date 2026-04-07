import { randomBytes } from "crypto";

const LOGIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LEGACY_STUDENT_LOGIN_CODE_LENGTH = 6;
export const STUDENT_LOGIN_CODE_LENGTH = 12;
export const MAX_STUDENT_LOGIN_CODE_LENGTH = 32;

export function getStudentLoginCodeVariants(loginCode: string) {
    const trimmedCode = loginCode.trim();
    return [...new Set([trimmedCode, trimmedCode.toUpperCase(), trimmedCode.toLowerCase()].filter(Boolean))];
}

export function generateStudentLoginCode(length = STUDENT_LOGIN_CODE_LENGTH) {
    const bytes = randomBytes(length);

    return Array.from(bytes, (byte) => LOGIN_CODE_ALPHABET[byte % LOGIN_CODE_ALPHABET.length]).join("");
}
