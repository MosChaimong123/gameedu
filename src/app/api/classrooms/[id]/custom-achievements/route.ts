import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { toPrismaJson } from "@/lib/prisma-json";

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
    const classroom = await db.classroom.findUnique({
      where: { id },
      select: { gamifiedSettings: true }
    });
    if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const settings = (classroom.gamifiedSettings as GamifiedSettings | null) || {};
    return NextResponse.json(settings.customAchievements || []);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/classrooms/[id]/custom-achievements — create a new custom achievement
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name, description, icon, goldReward } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const classroom = await db.classroom.findUnique({
      where: { id },
      select: { gamifiedSettings: true }
    });
    if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const settings = (classroom.gamifiedSettings as GamifiedSettings | null) || {};
    const existing = settings.customAchievements || [];

    const newAchievement: CustomAchievement = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || "",
      icon: icon || "🌟",
      goldReward: Number(goldReward) || 100,
      createdAt: new Date().toISOString(),
    };

    await db.classroom.update({
      where: { id },
      data: {
        gamifiedSettings: toPrismaJson({
          ...settings,
          customAchievements: [...existing, newAchievement]
        })
      }
    });

    return NextResponse.json({ success: true, achievement: newAchievement });
  } catch (error) {
    console.error("Error creating custom achievement:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/classrooms/[id]/custom-achievements — delete a custom achievement
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { achievementId } = await req.json();

    const classroom = await db.classroom.findUnique({
      where: { id },
      select: { gamifiedSettings: true }
    });
    if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const settings = (classroom.gamifiedSettings as GamifiedSettings | null) || {};
    const updated = (settings.customAchievements || []).filter((a) => a.id !== achievementId);

    await db.classroom.update({
      where: { id },
      data: { gamifiedSettings: toPrismaJson({ ...settings, customAchievements: updated }) }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
