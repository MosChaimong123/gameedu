import { NextResponse } from "next/server";
import { resolveAuditLogSink, resolveRateLimitStore } from "@/lib/env";

export async function GET() {
  const nodeEnv =
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "test"
        ? "test"
        : "development";

  return NextResponse.json({
    ok: true,
    status: "healthy",
    nodeEnv,
    rateLimitStore: resolveRateLimitStore(),
    auditLogSink: resolveAuditLogSink(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
