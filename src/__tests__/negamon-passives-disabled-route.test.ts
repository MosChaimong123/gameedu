import { describe, expect, it } from "vitest";

describe("negamon passive unlock route", () => {
  it("returns the disabled passive contract", async () => {
    const { POST } = await import("@/app/api/student/[code]/negamon/unlock-skill/route");

    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NEGAMON_PASSIVES_DISABLED",
        message: "Negamon passive skills are disabled",
      },
    });
  });
});
