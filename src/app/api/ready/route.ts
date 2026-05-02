import { NextResponse } from "next/server";
import { createAppErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { validateServerEnv } from "@/lib/env";
import { pingOperationalDb } from "@/lib/ops/mongo-admin";

export async function GET() {
  try {
    const env = validateServerEnv();
    await pingOperationalDb(env.HEALTHCHECK_DB_TIMEOUT_MS);

    return NextResponse.json({
      ok: true,
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return createAppErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : INTERNAL_ERROR_MESSAGE,
      503
    );
  }
}
