import { createAppErrorResponse } from "@/lib/api-error";

/** Purchasable Negamon passive skills are no longer supported. */
export async function POST() {
    return createAppErrorResponse(
        "NEGAMON_PASSIVES_DISABLED",
        "Negamon passive skills are disabled",
        410
    );
}
