import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { toPrismaJson } from "@/lib/prisma-json";

export interface ClassEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: "GOLD_BOOST" | "DOUBLE_QUEST" | "CUSTOM";
  multiplier: number;
  startAt: string;
  endAt: string;
  active: boolean;
}

type GamifiedSettings = {
  events?: ClassEvent[];
};

// GET /api/classrooms/[id]/events — get all events (students + teacher)
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
    const events: ClassEvent[] = settings.events || [];
    const now = new Date();

    const withActive = events.map((e) => ({
      ...e,
      active: new Date(e.startAt) <= now && new Date(e.endAt) >= now
    }));

    return NextResponse.json(withActive);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/classrooms/[id]/events — create event (teacher only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { title, description, icon, type, multiplier, startAt, endAt } = await req.json();

    if (!title?.trim() || !startAt || !endAt) {
      return NextResponse.json({ error: "title, startAt, endAt are required" }, { status: 400 });
    }

    const classroom = await db.classroom.findUnique({
      where: { id },
      select: { gamifiedSettings: true }
    });
    if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const settings = (classroom.gamifiedSettings as GamifiedSettings | null) || {};
    const existing: ClassEvent[] = settings.events || [];

    const newEvent: ClassEvent = {
      id: `event_${Date.now()}`,
      title: title.trim(),
      description: description?.trim() || "",
      icon: icon || "⚡",
      type: type || "CUSTOM",
      multiplier: Number(multiplier) || 1,
      startAt,
      endAt,
      active: false,
    };

    await db.classroom.update({
      where: { id },
      data: {
        gamifiedSettings: toPrismaJson({
          ...settings,
          events: [...existing, newEvent]
        })
      }
    });

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/classrooms/[id]/events — delete event (teacher only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { eventId } = await req.json();

    const classroom = await db.classroom.findUnique({
      where: { id },
      select: { gamifiedSettings: true }
    });
    if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const settings = (classroom.gamifiedSettings as GamifiedSettings | null) || {};
    const updated = (settings.events || []).filter((e: ClassEvent) => e.id !== eventId);

    await db.classroom.update({
      where: { id },
      data: { gamifiedSettings: toPrismaJson({ ...settings, events: updated }) }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
