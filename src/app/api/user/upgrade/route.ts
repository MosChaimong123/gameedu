import { requireSessionUser } from "@/lib/auth-guards"
import {
    AUTH_REQUIRED_MESSAGE,
    ENDPOINT_NO_LONGER_AVAILABLE_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";

export async function POST(req: Request) {
    try {
        const user = await requireSessionUser()
        if (!user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401)
        }

        await req.json().catch(() => null)
        return createAppErrorResponse(
            "ENDPOINT_NO_LONGER_AVAILABLE",
            ENDPOINT_NO_LONGER_AVAILABLE_MESSAGE,
            410
        )
    } catch (error) {
        console.error("[UPGRADE_POST]", error)
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500)
    }
}
