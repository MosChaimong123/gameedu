import { NextRequest, NextResponse } from "next/server";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { requireSessionUser } from "@/lib/auth-guards";
import { resyncNegamonBattleRewardsForGamePin } from "@/lib/negamon/sync-negamon-battle-rewards";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSessionUser();
  if (!user) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }

  const body = (await req.json().catch(() => null)) as { gamePin?: unknown } | null;
  const gamePin = typeof body?.gamePin === "string" ? body.gamePin.trim() : "";
  if (!gamePin) {
    return createAppErrorResponse("INVALID_PAYLOAD", "gamePin is required", 400);
  }
  if (!user.id) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }

  try {
    const result = await resyncNegamonBattleRewardsForGamePin({
      classroomId: id,
      teacherId: user.id,
      gamePin,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }
    console.error("[NEGAMON_REWARD_RESYNC]", error);
    return createAppErrorResponse("INTERNAL_ERROR", "Could not re-sync Negamon rewards.", 500);
  }
}
