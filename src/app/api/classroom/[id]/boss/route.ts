import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classroomId } = await params;
    const session = await auth();
    const body = await req.json();
    const { bossName, maxHp, rewardGold, deadline, image } = body;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Verify teacher owns the classroom
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { teacherId: true },
    });

    if (!classroom || classroom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Update classroom with boss settings
    const updatedClassroom = await db.classroom.update({
      where: { id: classroomId },
      data: {
        gamifiedSettings: {
          boss: {
            active: true,
            name: bossName || "มังกรแห่งความเกียจคร้าน",
            maxHp: maxHp || 1000,
            currentHp: maxHp || 1000,
            rewardGold: rewardGold || 500,
            image: image || "/assets/monsters/lethargy_dragon.png",
            deadline: deadline || null,
            createdAt: new Date().toISOString(),
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      boss: (updatedClassroom.gamifiedSettings as any).boss,
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

    // 1. Verify teacher
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { teacherId: true },
    });

    if (!classroom || classroom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Remove boss
    await db.classroom.update({
      where: { id: classroomId },
      data: {
        gamifiedSettings: null, 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error dismissing boss:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
