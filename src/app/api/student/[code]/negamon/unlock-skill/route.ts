import type { NextRequest } from "next/server";
import { createAppErrorResponse } from "@/lib/api-error";

/** Purchasable Negamon passive skills are no longer supported. */
export async function POST(
    _req: NextRequest,
    _ctx: { params: Promise<{ code: string }> }
) {
    return createAppErrorResponse(
        "NEGAMON_PASSIVES_DISABLED",
        "Negamon passive skills are disabled",
        410
    );
}
