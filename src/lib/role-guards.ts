/**
 * Teacher-facing dashboard + APIs.
 * Legacy `USER` accounts must be reclassified before using teacher routes.
 */
export function isTeacherOrAdmin(role?: string | null) {
    return role === "TEACHER" || role === "ADMIN";
}

/** Platform operator — full gamification / Negamon classroom controls, etc. */
export function isPlatformAdmin(role?: string | null) {
    return role === "ADMIN";
}
