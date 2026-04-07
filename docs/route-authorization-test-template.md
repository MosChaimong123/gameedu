# Route Authorization Test Template

Use this template when adding or refactoring a protected route.

## Goals

Every protected route should usually prove at least one of these:

- unauthenticated callers are rejected
- wrong role is rejected
- wrong ownership or wrong classroom scope is rejected
- the allowed path still works
- the response shape stays narrow when data exposure matters

## Minimal Test Layout

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockResourceFindUnique = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    resource: {
      findUnique: mockResourceFindUnique,
    },
  },
}));

describe("example route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import("@/app/api/example/route");
    const response = await GET(new Request("http://localhost/api/example") as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Unauthorized",
      },
    });
  });

  it("rejects users without ownership", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
    mockResourceFindUnique.mockResolvedValue({ ownerId: "user-2" });

    const { GET } = await import("@/app/api/example/route");
    const response = await GET(new Request("http://localhost/api/example") as never);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Forbidden",
      },
    });
  });

  it("allows the valid owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
    mockResourceFindUnique.mockResolvedValue({ ownerId: "user-1" });

    const { GET } = await import("@/app/api/example/route");
    const response = await GET(new Request("http://localhost/api/example") as never);

    expect(response.status).toBe(200);
  });
});
```

## Guest Route Template

If the route intentionally supports guest access, prove both sides:

- guest access works only for the intended resource scope
- cross-resource guest access is blocked

Example cases:

- valid `loginCode` for the target classroom is allowed
- `loginCode` from another classroom is rejected with `FORBIDDEN`
- missing session and missing guest credential is rejected with `AUTH_REQUIRED`

## Response Shape Checks

When a route changed from a wide model to a narrow DTO, add a shape assertion:

```ts
expect(body).toEqual({
  id: "user-1",
  name: "Alice",
  image: "avatar-1",
});
```

This is preferred over only checking one field because it protects against future accidental over-exposure.

## Test Checklist

- Does the test assert the HTTP status?
- Does the test assert `error.code`?
- Does the test verify that forbidden paths do not call the mutation?
- Does the allowed path assert at least one success behavior?
- If the route is guest-accessible, does the test prove the scope boundary?

## Good Real Examples In This Repo

- [leaderboard-route-auth.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/leaderboard-route-auth.test.ts)
- [classroom-gamification-authorization.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/classroom-gamification-authorization.test.ts)
- [history-route-role-authorization.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/history-route-role-authorization.test.ts)
- [omr-route-role-authorization.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/omr-route-role-authorization.test.ts)

## Review Rule

If a route introduces a new protection boundary, the PR should usually include the matching authorization test in the same change set.
