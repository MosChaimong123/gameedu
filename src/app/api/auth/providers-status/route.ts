import { NextResponse } from "next/server";
import { getAuthEnvDiagnostics, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth-env";

export const runtime = "nodejs";

/** Public read-only auth capability flags for UI (no secrets). */
export async function GET() {
  const diagnostics = getAuthEnvDiagnostics();
  return NextResponse.json({
    google: isGoogleOAuthConfigured(),
    credentials: diagnostics.hasAuthSecret,
    diagnostics,
  });
}
