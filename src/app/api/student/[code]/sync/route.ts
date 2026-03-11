import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { clientGold, lastSyncTime } = body;

    // 1. Find the student with full data for rank calculation
    const student = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      include: {
        classroom: {
          select: {
            levelConfig: true,
            assignments: {
              where: { visible: true },
              select: { id: true, type: true, checklists: true }
            }
          }
        },
        submissions: {
          select: { assignmentId: true, score: true }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 2. Calculate actual academic points (Academic Total) for rank-based gold rate
    const submissionMap = new Map(student.submissions.map(s => [s.assignmentId, s.score]));
    const academicTotal = (student.classroom?.assignments || []).reduce((sum, assignment) => {
        const score = submissionMap.get(assignment.id);
        if (score === undefined) return sum;

        if (assignment.type === 'checklist') {
            const checklistItems = assignment.checklists as any[];
            if (!Array.isArray(checklistItems)) return sum;
            return sum + checklistItems.reduce((cSum, item, i) => {
                const isChecked = (score & (1 << i)) !== 0;
                const points = typeof item === 'object' ? (item.points || 0) : 1;
                return isChecked ? cSum + points : cSum;
            }, 0);
        }
        return sum + score;
    }, 0);

    // 3. Server-side validation (Anti-Cheat)
    // IMPORTANT: Use academicTotal instead of student.points for rank-based rates
    const serverCalc = IdleEngine.calculateCurrentResources({
        ...student,
        points: academicTotal 
    });
    
    // Allow a small margin for network latency/client-side ticking (e.g., 5% or fixed amount)
    const maxAllowedGold = serverCalc.stats.gold + 10; 
    
    if (clientGold > maxAllowedGold) {
      console.warn(`[Anti-Cheat] Potential gold manipulation detected for student ${student.id}. Client: ${clientGold}, Max Allowed: ${maxAllowedGold}`);
    }

    const verifiedGold = Math.min(clientGold, maxAllowedGold);

    // 3. Update the database atomically
    const updatedStudent = await db.student.update({
      where: { id: student.id },
      data: {
        gameStats: {
          ...(student.gameStats as any || {}),
          gold: verifiedGold,
        },
        lastSyncTime: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      gold: verifiedGold,
      lastSyncTime: updatedStudent.lastSyncTime,
    });
  } catch (error) {
    console.error("Error syncing student resources:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
