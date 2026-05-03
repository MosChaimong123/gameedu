import { getSafeAuthCallbackPath } from "@/lib/auth/callback-url";

export type PostAuthRole = "STUDENT" | "ADMIN" | "TEACHER" | "USER" | null | undefined;

export function getDefaultPostAuthPath(role: PostAuthRole): string {
    if (role === "STUDENT") {
        return "/student/home";
    }
    if (role === "ADMIN") {
        return "/admin";
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
