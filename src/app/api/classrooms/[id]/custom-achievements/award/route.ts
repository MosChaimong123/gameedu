import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import {
  getClassroomGamificationRecord,
  getCustomAchievementsFromGamification,
} from "@/lib/services/classroom-settings/gamification-settings";
import { logAuditEvent } from "@/lib/security/audit-log";

// POST /api/classrooms/[id]/custom-achievements/award
// Body: { achievementId, studentId }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    const { id } = await params;
    const { achievementId, studentId } = await req.json();

    const classroom = await getClassroomGamificationRecord(id);

    if (!classroom) {
      return createAppErrorResponse("NOT_FOUND", "Classroom not found", 404);
    }

    if (classroom.teacherId !== session.user.id) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const customAchievements = getCustomAchievementsFromGamification(classroom.gamifiedSettings);
    const achievementDef = customAchievements.find((achievement) => achievement.id === achievementId);

    if (!achievementDef) {
      return createAppErrorResponse("NOT_FOUND", "Achievement not found", 404);
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        classId: true,
        achievements: { where: { achievementId } },
      },
    });

    if (!student) {
      return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
    }

    if (student.classId !== id) {
      return createAppErrorResponse("NOT_FOUND", "Student not found in classroom", 404);
    }

    if (student.achievements.length > 0) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Student already received this achievement", 400);
    }

    await db.studentAchievement.create({
      data: {
        studentId,
        achievementId,
        goldRewarded: achievementDef.goldReward,
      },
    });

    await db.student.update({
      where: { id: studentId },
      data: {
        behaviorPoints: { increment: achievementDef.goldReward },
      },
    });

    await db.pointHistory.create({
      data: {
        studentId,
        reason: `${achievementDef.icon} Special reward from teacher: ${achievementDef.name}`,
        value: achievementDef.goldReward,
      },
    });

    logAuditEvent({
      actorUserId: session.user.id,
      action: "classroom.custom_achievement.awarded",
      targetType: "student",
      targetId: studentId,
      metadata: {
        classroomId: id,
        achievementId,
        goldReward: achievementDef.goldReward,
      },
    });

    return NextResponse.json({ success: true, pointsAwarded: achievementDef.goldReward });
  } catch (error) {
    console.error("Error awarding custom achievement:", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
