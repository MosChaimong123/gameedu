import { describe, expect, it } from "vitest";

import { authConfig } from "@/auth.config";

const authorized = authConfig.callbacks?.authorized;

describe("auth.config authorized callback", () => {
  it("requires authentication for dashboard and student home routes", () => {
    expect(
      authorized?.({
        auth: null,
        request: { nextUrl: new URL("http://localhost:3000/dashboard") },
      } as never)
    ).toBe(false);

    expect(
      authorized?.({
        auth: null,
        request: { nextUrl: new URL("http://localhost:3000/student/home") },
      } as never)
    ).toBe(false);
  });

  it("redirects non-admin users away from admin routes", () => {
    const result = authorized?.({
      auth: { user: { role: "TEACHER" } },
      request: { nextUrl: new URL("http://localhost:3000/admin") },
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("redirects student users away from dashboard routes", () => {
    const result = authorized?.({
      auth: { user: { role: "STUDENT" } },
      request: { nextUrl: new URL("http://localhost:3000/dashboard/my-sets") },
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("location")).toBe("http://localhost:3000/student/home");
  });

  it("redirects legacy USER accounts away from teacher and student routes", () => {
    const dashboardResult = authorized?.({
      auth: { user: { role: "USER" } },
      request: { nextUrl: new URL("http://localhost:3000/dashboard") },
    } as never);

    expect(dashboardResult).toBeInstanceOf(Response);
    expect((dashboardResult as Response).headers.get("location")).toBe(
      "http://localhost:3000/login?error=role_required"
    );

    const studentHomeResult = authorized?.({
      auth: { user: { role: "USER" } },
      request: { nextUrl: new URL("http://localhost:3000/student/home") },
    } as never);

    expect(studentHomeResult).toBeInstanceOf(Response);
    expect((studentHomeResult as Response).headers.get("location")).toBe(
      "http://localhost:3000/login?error=role_required"
    );
  });

  it("allows matching privileged users through", () => {
    expect(
      authorized?.({
        auth: { user: { role: "ADMIN" } },
        request: { nextUrl: new URL("http://localhost:3000/admin") },
      } as never)
    ).toBe(true);

    expect(
      authorized?.({
        auth: { user: { role: "TEACHER" } },
        request: { nextUrl: new URL("http://localhost:3000/dashboard") },
      } as never)
    ).toBe(true);

    expect(
      authorized?.({
        auth: { user: { role: "STUDENT" } },
        request: { nextUrl: new URL("http://localhost:3000/student/home") },
      } as never)
    ).toBe(true);
  });
});
