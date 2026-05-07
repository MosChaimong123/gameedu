/**
 * Next.js global instrumentation hook — runs once when the Node or
 * Edge runtime starts. We wire Sentry here so every API route, RSC,
 * server action, and middleware error is captured automatically.
 *
 * Custom-server boot path (run-server.cjs → dist/server.js) imports
 * `@sentry/nextjs` directly inside `server.ts` to cover Socket.IO
 * handler errors that run outside of Next.js's request pipeline.
 */

import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  const Sentry = await import("@sentry/nextjs");
  const { scrubSentryEvent } = await import(
    "./src/lib/observability/sentry-pii"
  );

  const tracesSampleRate = parseTracesSampleRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE,
    0.05
  );
  const environment =
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV ||
    "production";
  const release = process.env.SENTRY_RELEASE?.trim();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment,
      release: release || undefined,
      tracesSampleRate,
      sendDefaultPii: false,
      beforeSend: scrubSentryEvent,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment,
      release: release || undefined,
      tracesSampleRate,
      sendDefaultPii: false,
      beforeSend: scrubSentryEvent,
    });
  }
}

function parseTracesSampleRate(raw: string | undefined, fallback: number): number {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

/**
 * Forward Next.js request errors (RSC, route handlers, server actions,
 * middleware) to Sentry with normalized context.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
