import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import {
  MATERIAL_TYPES,
  MATERIAL_TIER_MAP,
  CRAFT_REQUIREMENTS,
  craftItem,
} from "@/lib/game/crafting-system";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const body = await req.json();
    const { materialType, targetTier } = body as {
      materialType?: string;
      targetTier?: string;
    };

    // Validate required fields
    if (!materialType || !targetTier) {
      return NextResponse.json(
        { error: "materialType and targetTier are required" },
        { status: 400 }
      );
    }

    // Validate materialType is one of the 12 known types
    if (!(MATERIAL_TYPES as readonly string[]).includes(materialType)) {
      return NextResponse.json(
        { error: `Invalid materialType: ${materialType}` },
        { status: 400 }
      );
    }

    // Validate targetTier is a known tier
    if (!["COMMON", "RARE", "EPIC", "LEGENDARY"].includes(targetTier)) {
      return NextResponse.json(
        { error: `Invalid targetTier: ${targetTier}` },
        { status: 400 }
      );
    }

    // Validate materialType matches targetTier
    const expectedTier =
      MATERIAL_TIER_MAP[materialType as keyof typeof MATERIAL_TIER_MAP];
    if (expectedTier !== targetTier) {
      return NextResponse.json(
        {
          error: `Material "${materialType}" belongs to tier ${expectedTier}, not ${targetTier}`,
        },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await db.student.findUnique({ where: { code } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check student has sufficient materials
    const required = CRAFT_REQUIREMENTS[targetTier];
    const materialRecord = await db.material.findUnique({
      where: { studentId_type: { studentId: student.id, type: materialType } },
    });

    if (!materialRecord || materialRecord.quantity < required.quantity) {
      const have = materialRecord?.quantity ?? 0;
      return NextResponse.json(
        {
          error: `Insufficient materials: need ${required.quantity} ${materialType}, have ${have}`,
        },
        { status: 400 }
      );
    }

    // Run atomic transaction via craftItem
    const result = await craftItem(student.id, materialType, materialRecord.quantity, db);

    // Fetch the created StudentItem with item details
    const studentItem = await db.studentItem.findUnique({
      where: { id: result.studentItemId },
      include: { item: true },
    });

    return NextResponse.json({ item: studentItem });
  } catch (error) {
    console.error("[CRAFT_POST]", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
