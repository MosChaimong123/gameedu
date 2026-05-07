/**
 * Diagnostic-only: trigger a sample server error to confirm Sentry
 * is wired correctly in production. Disabled by default; enable by
 * setting `SENTRY_DIAG_ENABLED=true` on Render and call as an
 * authenticated TEACHER / ADMIN user.
 *
 * URL: POST `/api/admin/diag/sentry-test` — uses `diag` (not `_diag`)
 * because Next.js omits `_`-prefixed folders from the route path.
 *
 * The route never returns information about Sentry secrets and
 * always responds with a synthetic error so the caller can verify
 * the matching event in https://teachplayedu.sentry.io/issues/.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { auth } from "@/auth";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAG_TAG = "sentry-diag";

export async function POST(req: Request) {
  if (process.env.SENTRY_DIAG_ENABLED !== "true") {
    return createAppErrorResponse(
      "ENDPOINT_NO_LONGER_AVAILABLE",
      "Sentry diagnostic endpoint is disabled. Set SENTRY_DIAG_ENABLED=true to enable.",
      404
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }
  if (!isTeacherOrAdmin(role)) {
    return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
  }

  const dsnConfigured = Boolean(process.env.SENTRY_DSN);
  const stamp = new Date().toISOString();
  const correlation = `sentry-diag-${stamp}-${Math.random().toString(36).slice(2, 8)}`;

  let mode: "captured" | "thrown" = "captured";
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("mode") === "throw") {
      mode = "thrown";
    }
  } catch {
    /* ignore — body is optional */
  }

  const probeError = new Error(
    `[${DIAG_TAG}] Synthetic Sentry probe (${correlation}). This was triggered intentionally by an admin to confirm error transport.`
  );
  probeError.name = "SentryDiagnosticError";

  if (mode === "thrown") {
    // Returns 500 so onRequestError instrumentation captures it.
    throw probeError;
  }

  Sentry.withScope((scope) => {
    scope.setTag("diagnostic", DIAG_TAG);
    scope.setTag("correlation_id", correlation);
    scope.setLevel("warning");
    scope.setExtra("invoked_by_user_id", userId);
    scope.setExtra("invoked_at", stamp);
    Sentry.captureException(probeError);
  });

  return NextResponse.json({
    ok: true,
    mode,
    correlation,
    sentryDsnConfigured: dsnConfigured,
    expectedNextStep:
      "Open https://teachplayedu.sentry.io/issues/ and search for the correlation tag (above) to confirm transport.",
  });
}
