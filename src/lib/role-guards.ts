/**
 * Teacher-facing dashboard + APIs. Includes `USER` because Google OAuth keeps Prisma
 * default role `USER`; email/password registration sets `TEACHER` or `STUDENT` explicitly.
 */
export function isTeacherOrAdmin(role?: string | null) {
    return role === "TEACHER" || role === "ADMIN" || role === "USER";
}

/** Platform operator — full gamification / Negamon classroom controls, etc. */
export function isPlatformAdmin(role?: string | null) {
    return role === "ADMIN";
}
