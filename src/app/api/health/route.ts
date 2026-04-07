import { NextResponse } from "next/server";
import { getAppEnv, resolveAuditLogSink, resolveRateLimitStore } from "@/lib/env";

export async function GET() {
  const env = getAppEnv();

  return NextResponse.json({
    ok: true,
    status: "healthy",
    nodeEnv: env.NODE_ENV,
    rateLimitStore: resolveRateLimitStore(),
    auditLogSink: resolveAuditLogSink(),
    timestamp: new Date().toISOString(),
  });
}
