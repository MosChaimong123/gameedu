import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

// GET /api/student/inventory - Get inventory for a student
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    const inventory = await db.studentItem.findMany({
      where: { studentId },
      include: { item: true },
      orderBy: { createdAt: "desc" }
    });

    // Filter out dangling references (item deleted after seeding)
    const valid = inventory.filter((si: any) => si.item != null);
    return NextResponse.json(valid);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
