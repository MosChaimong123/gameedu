import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_CHANGE_MIN_LENGTH = PASSWORD_MIN_LENGTH;

const COMMON_PASSWORDS = new Set([
    "123456789012",
    "password1234",
    "password12345",
    "qwerty123456",
    "admin12345678",
    "letmein123456",
    "iloveyou1234",
]);

export const loginPasswordSchema = z.string().min(1).max(PASSWORD_MAX_LENGTH);

export const newPasswordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
    .refine((password) => !COMMON_PASSWORDS.has(password.toLowerCase()), "Password is too common");

export const passwordChangeSchema = newPasswordSchema;

export function isPasswordChangeAllowed(password: string): boolean {
    return newPasswordSchema.safeParse(password).success;
}
