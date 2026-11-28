export function isCivilizationIdleEnabled(): boolean {
  return process.env.CIVILIZATION_IDLE_ENABLED === "true";
}

export function getCivilizationIdlePilotClassroomIds(): string[] {
  return [...new Set(
    (process.env.CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  )];
}

export function isCivilizationIdleEnabledForClass(classId: string): boolean {
  if (!isCivilizationIdleEnabled()) return false;
  const pilotClassroomIds = getCivilizationIdlePilotClassroomIds();
  return pilotClassroomIds.includes("*") || pilotClassroomIds.includes(classId);
}
