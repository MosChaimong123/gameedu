/**
 * Classroom gamification toolbar (rank settings, events, Negamon).
 * Classroom gamification is retired and hidden by default. The explicit opt-in
 * remains temporarily available as a rollback control during the removal rollout.
 */
export function isClassroomGamificationEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_CLASSROOM_GAMIFICATION_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "on";
}
