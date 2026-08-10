import { createHash } from "node:crypto";
import { newPasswordSchema } from "@/lib/auth/password-policy";

export type PasswordBreachCheckResult = "safe" | "compromised" | "unavailable" | "disabled";

export async function checkPasswordBreach(
    password: string,
    options: { fetcher?: typeof fetch; enabled?: boolean } = {}
): Promise<PasswordBreachCheckResult> {
    const mode = process.env.PASSWORD_BREACH_CHECK;
    const enabled = options.enabled ?? (mode === "enabled" || mode === "enforce");
    if (!enabled) return "disabled";

    const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    try {
        const response = await (options.fetcher ?? fetch)(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: { "Add-Padding": "true", "User-Agent": "GameEdu-Password-Policy" },
            signal: AbortSignal.timeout(3_000),
        });
        if (!response.ok) return "unavailable";
        const compromised = (await response.text())
            .split(/\r?\n/)
            .some((line) => line.split(":", 1)[0]?.trim().toUpperCase() === suffix);
        return compromised ? "compromised" : "safe";
    } catch {
        return "unavailable";
    }
}

export async function validateNewPassword(password: string) {
    const parsed = newPasswordSchema.safeParse(password);
    if (!parsed.success) return { valid: false as const, reason: "policy" as const };
    const breach = await checkPasswordBreach(password);
    if (breach === "compromised") return { valid: false as const, reason: "compromised" as const };
    if (breach === "unavailable" && process.env.PASSWORD_BREACH_CHECK === "enforce") {
        return { valid: false as const, reason: "breach_check_unavailable" as const };
    }
    return { valid: true as const, breach };
}
