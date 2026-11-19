const ENABLED_VALUES = new Set(["1", "true", "on", "yes"]);

/**
 * Server-side retirement switch for classroom-bound game features.
 * Production and development default to disabled; tests keep legacy behavior
 * unless a test explicitly exercises the retired state.
 */
export function isClassroomGameSystemEnabled(): boolean {
  const raw = process.env.CLASSROOM_GAME_SYSTEM_ENABLED?.trim().toLowerCase();
  if (raw) return ENABLED_VALUES.has(raw);
  return process.env.NODE_ENV === "test";
}

export const CLASSROOM_GAME_RETIRED_ERROR = {
  error: {
    code: "CLASSROOM_GAME_SYSTEM_RETIRED",
    message: "Classroom game features are no longer available",
  },
} as const;

const CLASSROOM_GAME_API_SEGMENTS = new Set([
  "battle",
  "custom-achievements",
  "economy",
  "events",
  "gamification-settings",
  "leaderboard",
  "negamon",
]);

const STUDENT_GAME_API_SEGMENTS = new Set([
  "battle-loadout",
  "checkin",
  "claim-passive-gold",
  "daily-quests",
  "negamon",
  "shop",
]);

export function isRetiredClassroomGameRequest(method: string, pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const normalizedMethod = method.toUpperCase();

  if (segments[0] === "api" && segments[1] === "classrooms") {
    const domain = segments[3];
    if (!domain || !CLASSROOM_GAME_API_SEGMENTS.has(domain)) return false;
    if (domain === "battle") {
      return normalizedMethod !== "GET" || segments[4] === "opponents";
    }
    if (domain === "economy") return segments[4] === "adjust" && normalizedMethod !== "GET";
    if (domain === "events") return normalizedMethod === "POST" || normalizedMethod === "DELETE";
    if (domain === "gamification-settings") return normalizedMethod === "PATCH";
    if (domain === "custom-achievements") return true;
    if (domain === "negamon") return segments[4] === "reward-resync" && normalizedMethod === "POST";
    return false;
  }

  if (segments[0] === "api" && segments[1] === "student") {
    return (
      (segments[2] === "negamon" && segments[3] === "select") ||
      Boolean(segments[3] && STUDENT_GAME_API_SEGMENTS.has(segments[3]))
    );
  }

  return false;
}
