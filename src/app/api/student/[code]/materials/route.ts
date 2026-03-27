import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MATERIAL_TIER_MAP } from "@/lib/game/crafting-system";

// GET /api/student/[code]/materials
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: { id: true },
    });

    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const materials = await db.material.findMany({
      where: { studentId: student.id, quantity: { gt: 0 } },
      orderBy: { type: "asc" },
    });

    const enriched = materials.map((m) => ({
      type: m.type,
      quantity: m.quantity,
      tier: MATERIAL_TIER_MAP[m.type as keyof typeof MATERIAL_TIER_MAP] ?? "COMMON",
    }));

    return NextResponse.json({ materials: enriched });
  } catch (error) {
    console.error("[MATERIALS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
