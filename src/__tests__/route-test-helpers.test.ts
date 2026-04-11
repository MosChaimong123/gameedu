import { describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

describe("route test helpers", () => {
  it("creates a JSON-like request body helper", async () => {
    const request = makeJsonRequest({ name: "Alice", score: 10 });

    await expect(request.json()).resolves.toEqual({ name: "Alice", score: 10 });
  });

  it("creates route params wrapped in a promise", async () => {
    await expect(makeRouteParams({ id: "class-1" }).params).resolves.toEqual({
      id: "class-1",
    });
  });

  it("asserts structured app errors", async () => {
    const response = {
      status: 403,
      json: vi.fn().mockResolvedValue({
        error: {
          code: "FORBIDDEN",
          message: "Forbidden",
        },
      }),
    } as unknown as Response;

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });
});
