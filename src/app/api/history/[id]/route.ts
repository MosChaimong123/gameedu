
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { db as prisma } from "@/lib/db";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
        }

        if (!isTeacherOrAdmin(session.user.role)) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const game = await prisma.gameHistory.findUnique({
            where: {
                id: params.id,
            },
        });

        if (!game) {
            return createAppErrorResponse("NOT_FOUND", "Game not found", 404);
        }

        // Security check: Only host can view details? 
        // Or maybe players who played it? For now, stick to Host.
        if (game.hostId !== session.user.id) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        return NextResponse.json(game);

    } catch (error) {
        console.error("GET /api/history/[id] Error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
