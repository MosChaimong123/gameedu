export function isTeacherOrAdmin(role?: string | null) {
    return role === "TEACHER" || role === "ADMIN";
}
