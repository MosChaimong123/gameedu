import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { listLineWebhookFailures } from "@/lib/line-bot/webhook-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (session.user.role !== "ADMIN") {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }
    const search = new URL(request.url).searchParams;
    const rawStatus = search.get("status");
    const status = rawStatus === "dead" || rawStatus === "retry_wait" ? rawStatus : undefined;
    const take = Number(search.get("take"));
    const events = await listLineWebhookFailures({
        status,
        take: Number.isFinite(take) ? take : undefined,
    });
    return NextResponse.json({ events, count: events.length });
}
