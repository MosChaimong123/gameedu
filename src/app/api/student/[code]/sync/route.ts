import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy sync endpoint removed. Student portal no longer performs RPG/game-state sync.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  void req;
  void context;

  return NextResponse.json(
    { error: "This endpoint is no longer available" },
    { status: 410 }
  );
}
