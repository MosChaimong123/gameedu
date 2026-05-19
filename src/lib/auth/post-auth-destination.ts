import { getSafeAuthCallbackPath } from "@/lib/auth/callback-url";

export type PostAuthRole = "STUDENT" | "ADMIN" | "TEACHER" | "USER" | null | undefined;

const ROLE_REQUIRED_PATH = "/login?error=role_required";

/** Narrows DB / session string roles for post-auth routing. Unknown values become undefined (dashboard). */
export function normalizePostAuthRole(role: string | null | undefined): PostAuthRole {
    if (role === "STUDENT" || role === "ADMIN" || role === "TEACHER" || role === "USER") {
        return role;
    }
    return undefined;
}

export function getDefaultPostAuthPath(role: PostAuthRole): string {
    if (role === "STUDENT") {
        return "/student/home";
    }
    if (role === "ADMIN") {
        return "/admin";
    }
    if (role === "USER") {
        return ROLE_REQUIRED_PATH;
    }
    return "/dashboard";
}

export function resolvePostAuthDestination(
    role: PostAuthRole,
    callbackUrl: string | null | undefined,
    origin: string | null | undefined
): string {
    return getSafeAuthCallbackPath(callbackUrl, origin) ?? getDefaultPostAuthPath(role);
}
