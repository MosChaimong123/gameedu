import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { getLineBotChatUrl } from "@/lib/line-bot/config";
import { getStudentLineLinkSnapshot } from "@/lib/line-bot/student-linking";

export const runtime = "nodejs";

export async function GET(
    _req: Request,
    context: { params: Promise<{ code: string }> }
) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    const { code } = await context.params;

    try {
        const result = await getStudentLineLinkSnapshot({
            userId,
            loginCode: code,
        });

        if (!result.ok) {
            if (result.reason === "FORBIDDEN") {
                return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
            }
            return createAppErrorResponse("INVALID_LOGIN_CODE", "Student not found", 404);
        }

        return Response.json({
            ...result.snapshot,
            openChatUrl: getLineBotChatUrl() ?? null,
        });
    } catch (error) {
        console.error("[api/student/line-link] failed", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
