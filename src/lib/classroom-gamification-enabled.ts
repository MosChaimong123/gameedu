/**
 * Classroom gamification toolbar (rank settings, events, Negamon).
 * Enabled by default for teachers; set `NEXT_PUBLIC_CLASSROOM_GAMIFICATION_ENABLED=false` to hide.
 */
export function isClassroomGamificationEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_CLASSROOM_GAMIFICATION_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") return false;
  return true;
}
