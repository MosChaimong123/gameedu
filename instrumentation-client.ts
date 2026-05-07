/**
 * Next.js client-side Sentry hook — Next 15+ replaces the legacy
 * `sentry.client.config.ts` with this file. Browser-side errors
 * (unhandled rejections, React error boundaries, fetch failures)
 * are captured here.
 */

import * as Sentry from "@sentry/nextjs";

import { scrubSentryEvent } from "./src/lib/observability/sentry-pii";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = parseTracesSampleRate(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  0.05
);
const environment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
  process.env.NODE_ENV ||
  "production";
const release = process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release: release || undefined,
    tracesSampleRate,
    sendDefaultPii: false,
    integrations: [],
    beforeSend: scrubSentryEvent,
  });
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

/** Capture transitions caused by `next/router` for client-side tracing. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
