import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import {
  getBossPreset,
  getDifficulty,
  computeBossHp,
  computeRewardGold,
  DIFFICULTY_MATERIALS,
  XP_FROM_GOLD_RATIO,
} from "@/lib/game/boss-config";
import { persistGamifiedSettingsWithBossTemplate } from "@/lib/game/personal-classroom-boss";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classroomId } = await params;
    const session = await auth();
    const body = await req.json();

    const {
      bossId,
      difficulty = "EASY",
      rewardGold,
      rewardGoldMultiplier = 1.0,
    } = body;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bossPreset = getBossPreset(bossId);
    if (!bossPreset) {
      return NextResponse.json({ error: `Unknown boss: ${bossId}` }, { status: 400 });
    }

    const diffConfig = getDifficulty(difficulty);
    if (!diffConfig) {
      return NextResponse.json({ error: `Unknown difficulty: ${difficulty}` }, { status: 400 });
    }

    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { gamifiedSettings: true, teacherId: true },
    });

    if (!classroom || classroom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const maxHp = computeBossHp(bossId, difficulty);
    const gold = rewardGold ?? computeRewardGold(difficulty, rewardGoldMultiplier);
    const xp = Math.round(gold * XP_FROM_GOLD_RATIO);
    const materials = DIFFICULTY_MATERIALS[difficulty] ?? [];

    const existing = (classroom.gamifiedSettings as Record<string, unknown>) || {};
    const template = {
      templateId: randomUUID(),
      bossId,
      difficulty,
      name: bossPreset.name,
      image: bossPreset.image,
      element: bossPreset.element,
      elementIcon: bossPreset.elementIcon,
      elementKey: bossPreset.elementKey,
      maxHp,
      rewardGold: gold,
      rewardXp: xp,
      rewardMaterials: materials,
      passiveDamageMultiplier: bossPreset.passiveDamageMultiplier,
      createdAt: new Date().toISOString(),
    };

    const updatedClassroom = await db.classroom.update({
      where: { id: classroomId },
      data: {
        gamifiedSettings: persistGamifiedSettingsWithBossTemplate(existing, template) as Prisma.InputJsonValue,
      },
    });

    const gs = updatedClassroom.gamifiedSettings as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      bossRaidTemplate: gs.bossRaidTemplate,
      template,
    });
  } catch (error) {
    console.error("Error summoning boss:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classroomId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { teacherId: true, gamifiedSettings: true },
    });

    if (!classroom || classroom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = (classroom.gamifiedSettings as Record<string, unknown>) || {};

    await db.classroom.update({
      where: { id: classroomId },
      data: {
        gamifiedSettings: persistGamifiedSettingsWithBossTemplate(existing, null) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error dismissing boss:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
