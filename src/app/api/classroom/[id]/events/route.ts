import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export interface ClassEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: "GOLD_BOOST" | "DOUBLE_QUEST" | "CUSTOM";
  multiplier: number; // e.g. 2 = double gold rate
  startAt: string;   // ISO string
  endAt: string;     // ISO string
  active: boolean;
}

// GET /api/classroom/[id]/events — get all events (students + teacher)
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

    const settings = (classroom.gamifiedSettings as any) || {};
    const events: ClassEvent[] = settings.events || [];
    const now = new Date();
    
    // Mark which events are currently active
    const withActive = events.map((e: any) => ({
      ...e,
      active: new Date(e.startAt) <= now && new Date(e.endAt) >= now
    }));

    return NextResponse.json(withActive);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/classroom/[id]/events — create event (teacher only)
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

    const settings = (classroom.gamifiedSettings as any) || {};
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
        gamifiedSettings: {
          ...settings,
          events: [...existing, newEvent]
        } as any
      }
    });

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/classroom/[id]/events — delete event (teacher only)
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

    const settings = (classroom.gamifiedSettings as any) || {};
    const updated = (settings.events || []).filter((e: ClassEvent) => e.id !== eventId);

    await db.classroom.update({
      where: { id },
      data: { gamifiedSettings: { ...settings, events: updated } as any }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
