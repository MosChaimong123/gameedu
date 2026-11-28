import { afterEach, describe, expect, it } from "vitest";
import {
  getCivilizationIdlePilotClassroomIds,
  isCivilizationIdleEnabled,
  isCivilizationIdleEnabledForClass,
} from "@/lib/civilization-idle/feature-flag";

afterEach(() => {
  delete process.env.CIVILIZATION_IDLE_ENABLED;
  delete process.env.CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS;
});

describe("Civilization Idle rollout flags", () => {
  it("stays disabled unless explicitly enabled", () => {
    expect(isCivilizationIdleEnabled()).toBe(false);
    expect(isCivilizationIdleEnabledForClass("class-1")).toBe(false);
  });

  it("fails closed when enabled without an allowlist", () => {
    process.env.CIVILIZATION_IDLE_ENABLED = "true";
    expect(isCivilizationIdleEnabledForClass("class-1")).toBe(false);
  });

  it("requires an explicit wildcard for a global rollout", () => {
    process.env.CIVILIZATION_IDLE_ENABLED = "true";
    process.env.CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS = "*";
    expect(isCivilizationIdleEnabledForClass("class-1")).toBe(true);
    expect(isCivilizationIdleEnabledForClass("class-2")).toBe(true);
  });

  it("normalizes the pilot allowlist and restricts access to exact classroom ids", () => {
    process.env.CIVILIZATION_IDLE_ENABLED = "true";
    process.env.CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS = " class-1, class-2 ,,class-1 ";

    expect(getCivilizationIdlePilotClassroomIds()).toEqual(["class-1", "class-2"]);
    expect(isCivilizationIdleEnabledForClass("class-1")).toBe(true);
    expect(isCivilizationIdleEnabledForClass("class-10")).toBe(false);
  });
});
