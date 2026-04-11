import { NextRequest } from "next/server";

import { handleClassroomLeaderboardGet } from "@/lib/api-handlers/classroom-leaderboard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleClassroomLeaderboardGet(req, id);
}
