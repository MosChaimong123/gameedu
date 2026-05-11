import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createAppErrorResponse,
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  INTERNAL_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE,
} from "@/lib/api-error";
import {
  getCustomAchievementsFromGamification,
  getClassroomGamificationRecord,
  updateGamificationSettings,
} from "@/lib/services/classroom-settings/gamification-settings";
import { logAuditEvent } from "@/lib/security/audit-log";

type CustomAchievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  goldReward: number;
  createdAt: string;
};

type GamifiedSettings = {
  customAchievements?: CustomAchievement[];
};

// GET /api/classrooms/[id]/custom-achievements — list all custom achievements for a classroom
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const classroom = await getClassroomGamificationRecord(id);
    if (!classroom) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    return NextResponse.json(getCustomAchievementsFromGamification(classroom.gamifiedSettings));
  } catch {
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}

// POST /api/classrooms/[id]/custom-achievements — create a new custom achievement
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    if (session.user.role !== "ADMIN") {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const { id } = await params;
    const { name, description, icon, goldReward } = await req.json();

    if (!name?.trim()) return createAppErrorResponse("INVALID_PAYLOAD", "Name is required", 400);

    const classroom = await getClassroomGamificationRecord(id);
    if (!classroom) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    if (!classroom.teacherId) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    const settings = classroom.gamifiedSettings as GamifiedSettings;
    const existing = getCustomAchievementsFromGamification(settings);

    const newAchievement: CustomAchievement = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || "",
      icon: icon || "🌟",
      goldReward: Number(goldReward) || 100,
      createdAt: new Date().toISOString(),
    };

    await updateGamificationSettings(id, classroom.teacherId, {
      ...settings,
      customAchievements: [...existing, newAchievement],
    });

    logAuditEvent({
      actorUserId: session.user.id,
      action: "classroom.custom_achievement.created",
      targetType: "classroom",
      targetId: id,
      metadata: {
        achievementId: newAchievement.id,
        achievementName: newAchievement.name,
        goldReward: newAchievement.goldReward,
      },
    });

    return NextResponse.json({ success: true, achievement: newAchievement });
  } catch (error) {
    console.error("Error creating custom achievement:", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}

// DELETE /api/classrooms/[id]/custom-achievements — delete a custom achievement
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    if (session.user.role !== "ADMIN") {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const { id } = await params;
    const { achievementId } = await req.json();

    const classroom = await getClassroomGamificationRecord(id);
    if (!classroom) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    if (!classroom.teacherId) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    const settings = classroom.gamifiedSettings as GamifiedSettings;
    const updated = getCustomAchievementsFromGamification(settings).filter((a) => a.id !== achievementId);

    await updateGamificationSettings(id, classroom.teacherId, {
      ...settings,
      customAchievements: updated,
    });

    logAuditEvent({
      actorUserId: session.user.id,
      action: "classroom.custom_achievement.deleted",
      targetType: "classroom",
      targetId: id,
      metadata: {
        achievementId,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
