import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import {
  canLoginCodeAccessClassroom,
  canUserAccessClassroom,
} from "@/lib/authorization/resource-access";
import { db } from "@/lib/db";

/** Shared GET handler for `/api/classrooms/[id]/leaderboard` (and legacy redirects). */
export async function handleClassroomLeaderboardGet(
  req: NextRequest,
  classId: string
): Promise<NextResponse> {
  try {
    const session = await auth();
    const loginCode = new URL(req.url).searchParams.get("code")?.trim().toUpperCase();

    if (!session?.user?.id && !loginCode) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    let canAccess = false;

    if (session?.user?.id) {
      canAccess = await canUserAccessClassroom(db, session.user.id, classId);
    }

    if (!canAccess && loginCode) {
      canAccess = await canLoginCodeAccessClassroom(db, loginCode, classId);
    }

    if (!canAccess) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const students = await db.student.findMany({
      where: { classId: classId },
      select: {
        id: true,
        name: true,
        avatar: true,
        behaviorPoints: true,
        gold: true,
      },
    });

    const ranked = students
      .map((student) => ({
        id: student.id,
        name: student.name,
        avatar: student.avatar,
        behaviorPoints: student.behaviorPoints,
        gold: student.gold ?? 0,
      }))
      .sort((a, b) => b.behaviorPoints - a.behaviorPoints)
      .map((student, index) => ({ ...student, rank: index + 1 }));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
