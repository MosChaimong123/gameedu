import type { AppRole } from "@/lib/roles";

export const SESSION_RECENT_AUTH_WINDOW_MS = 10 * 60_000;
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60_000;

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

export function getSessionLifetime(role: AppRole | undefined) {
  switch (role) {
    case "ADMIN":
      return { absoluteMs: 8 * HOUR, idleMs: 30 * 60_000 };
    case "STUDENT":
      return { absoluteMs: 30 * DAY, idleMs: 7 * DAY };
    case "TEACHER":
      return { absoluteMs: 7 * DAY, idleMs: DAY };
    default:
      return { absoluteMs: 7 * DAY, idleMs: DAY };
  }
}

export function hasRecentAuthentication(authenticatedAt: number | undefined, now = Date.now()) {
  return typeof authenticatedAt === "number" && authenticatedAt <= now && now - authenticatedAt <= SESSION_RECENT_AUTH_WINDOW_MS;
}
