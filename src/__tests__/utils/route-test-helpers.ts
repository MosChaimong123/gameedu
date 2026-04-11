import { expect } from "vitest";
import type { AppErrorCode } from "@/lib/api-error";

type JsonRequestBody = Record<string, unknown>;

type ExpectedAppError = {
  status: number;
  code: AppErrorCode;
  message: string;
};

export function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

export function makeRouteParams<T extends Record<string, string>>(params: T): {
  params: Promise<T>;
} {
  return { params: Promise.resolve(params) };
}

export async function expectAppErrorResponse(
  response: Response,
  expected: ExpectedAppError
): Promise<void> {
  const body = await response.json();

  expect(response.status).toBe(expected.status);
  expect(body).toEqual({
    error: {
      code: expected.code,
      message: expected.message,
    },
  });
}
