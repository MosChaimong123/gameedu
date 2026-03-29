import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Legacy sync endpoint — no RPG state; returns success and last `updatedAt`.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    await req.json().catch(() => ({}));

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true, updatedAt: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lastSyncTime: student.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error syncing student:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
