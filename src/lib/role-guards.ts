/**
 * Teacher-facing dashboard + APIs. Includes `USER` because OAuth sign-in (Google)
 * creates accounts with Prisma default role `USER` until promoted to `TEACHER`.
 */
export function isTeacherOrAdmin(role?: string | null) {
    return role === "TEACHER" || role === "ADMIN" || role === "USER";
}
