import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetStudentAccessSession = vi.fn();
const mockIsCivilizationIdleEnabled = vi.fn();
const mockIsCivilizationIdleEnabledForClass = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
const mockRedirect = vi.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
  redirect: mockRedirect,
}));

vi.mock("@/lib/auth/student-access-session", () => ({
  getStudentAccessSession: mockGetStudentAccessSession,
}));

vi.mock("@/lib/civilization-idle", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/civilization-idle")>();
  return {
    ...original,
    isCivilizationIdleEnabled: mockIsCivilizationIdleEnabled,
    isCivilizationIdleEnabledForClass: mockIsCivilizationIdleEnabledForClass,
  };
});

vi.mock("@/components/civilization-idle/civilization-game", () => ({
  CivilizationGame: () => null,
}));

describe("Civilization Idle page authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCivilizationIdleEnabled.mockReturnValue(true);
    mockIsCivilizationIdleEnabledForClass.mockReturnValue(true);
    mockGetStudentAccessSession.mockResolvedValue({ classId: "class-1", student: { id: "student-1" } });
  });

  it("returns not found for a valid student outside the pilot classroom", async () => {
    mockIsCivilizationIdleEnabledForClass.mockReturnValue(false);
    const { default: Page } = await import("@/app/student/access/civilization/page");

    await expect(Page()).rejects.toThrow("NOT_FOUND");
    expect(mockIsCivilizationIdleEnabledForClass).toHaveBeenCalledWith("class-1");
  });

  it("returns not found while the feature flag is disabled", async () => {
    mockIsCivilizationIdleEnabled.mockReturnValue(false);
    const { default: Page } = await import("@/app/student/access/civilization/page");

    await expect(Page()).rejects.toThrow("NOT_FOUND");
    expect(mockGetStudentAccessSession).not.toHaveBeenCalled();
  });

  it("redirects an expired student access session", async () => {
    mockGetStudentAccessSession.mockResolvedValue(null);
    const { default: Page } = await import("@/app/student/access/civilization/page");

    await expect(Page()).rejects.toThrow("REDIRECT:/student?error=session_expired");
    expect(mockGetStudentAccessSession).toHaveBeenCalledWith("student:read");
  });

  it("renders for a valid student access session", async () => {
    const { default: Page } = await import("@/app/student/access/civilization/page");

    const result = await Page();

    expect(result).toBeTruthy();
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
