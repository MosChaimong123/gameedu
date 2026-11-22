import { describe, expect, it, vi } from "vitest";
import { isClassroomGamificationEnabled } from "@/lib/classroom-gamification-enabled";

describe("isClassroomGamificationEnabled", () => {
  it("is disabled by default", () => {
    vi.unstubAllEnvs();
    expect(isClassroomGamificationEnabled()).toBe(false);
  });

  it("can be temporarily enabled via env for rollback", () => {
    vi.stubEnv("NEXT_PUBLIC_CLASSROOM_GAMIFICATION_ENABLED", "true");
    expect(isClassroomGamificationEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });
});
