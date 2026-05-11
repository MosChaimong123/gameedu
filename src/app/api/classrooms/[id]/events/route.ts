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
  canLoginCodeAccessClassroom,
  canUserAccessClassroom,
} from "@/lib/authorization/resource-access";
import { db } from "@/lib/db";
import {
  getClassEventsFromGamification,
  getClassroomGamificationRecord,
  updateGamificationSettings,
} from "@/lib/services/classroom-settings/gamification-settings";
import { logAuditEvent } from "@/lib/security/audit-log";

export interface ClassEvent {
  id: string;
  title: string;
  description?: string;
  icon: string;
  type: "GOLD_BOOST" | "GOLD_BOOST_3" | "DOUBLE_QUEST" | "CUSTOM";
  multiplier: number;
  startAt: string;
  endAt: string;
  active?: boolean;
}

type GamifiedSettings = {
  events?: ClassEvent[];
};

// GET /api/classrooms/[id]/events — class members only (teacher session or ?code= student login code)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const loginCode = new URL(req.url).searchParams.get("code")?.trim().toUpperCase() ?? "";

    if (!session?.user?.id && !loginCode) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    let canAccess = false;
    if (session?.user?.id) {
      canAccess = await canUserAccessClassroom(db, session.user.id, id);
    }
    if (!canAccess && loginCode) {
      canAccess = await canLoginCodeAccessClassroom(db, loginCode, id);
    }
    if (!canAccess) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const classroom = await getClassroomGamificationRecord(id);
    if (!classroom) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);

    const events = getClassEventsFromGamification(classroom.gamifiedSettings) as ClassEvent[];
    const now = new Date();

    const withActive = events.map((e) => ({
      ...e,
      active: new Date(e.startAt) <= now && new Date(e.endAt) >= now
    }));

    return NextResponse.json(withActive);
  } catch {
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}

// POST /api/classrooms/[id]/events — create event (teacher only)
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
    const { title, description, icon, type, multiplier, startAt, endAt } = await req.json();

    if (!title?.trim() || !startAt || !endAt) {
      return createAppErrorResponse("INVALID_PAYLOAD", "title, startAt, endAt are required", 400);
    }

    const classroom = await getClassroomGamificationRecord(id);
    if (!classroom) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    if (!classroom.teacherId) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    const settings = classroom.gamifiedSettings as GamifiedSettings;
    const existing = getClassEventsFromGamification(settings) as ClassEvent[];

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

    await updateGamificationSettings(id, classroom.teacherId, {
      ...settings,
      events: [...existing, newEvent],
    });

    logAuditEvent({
      actorUserId: session.user.id,
      action: "classroom.event.created",
      targetType: "classroom",
      targetId: id,
      metadata: {
        eventId: newEvent.id,
        eventType: newEvent.type,
        multiplier: newEvent.multiplier,
      },
    });

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}

// DELETE /api/classrooms/[id]/events — delete event (teacher only)
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
    const { eventId } = await req.json();

    const classroom = await getClassroomGamificationRecord(id);
    if (!classroom) return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    if (!classroom.teacherId) {
      return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    const settings = classroom.gamifiedSettings as GamifiedSettings;
    const updated = getClassEventsFromGamification(settings).filter((e: ClassEvent) => e.id !== eventId);

    await updateGamificationSettings(id, classroom.teacherId, {
      ...settings,
      events: updated,
    });

    logAuditEvent({
      actorUserId: session.user.id,
      action: "classroom.event.deleted",
      targetType: "classroom",
      targetId: id,
      metadata: {
        eventId,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
  }
}
