import { describe, expect, it, vi } from "vitest";
import { isClassroomGamificationEnabled } from "@/lib/classroom-gamification-enabled";

describe("isClassroomGamificationEnabled", () => {
  it("is enabled by default", () => {
    vi.unstubAllEnvs();
    expect(isClassroomGamificationEnabled()).toBe(true);
  });

  it("can be disabled via env", () => {
    vi.stubEnv("NEXT_PUBLIC_CLASSROOM_GAMIFICATION_ENABLED", "false");
    expect(isClassroomGamificationEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
