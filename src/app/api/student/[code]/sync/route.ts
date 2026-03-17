import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";
import { checkAndGrantAchievements } from "@/lib/game/achievement-engine";

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
        items: {
          where: { isEquipped: true },
          include: { item: true }
        },
        classroom: {
          select: {
            levelConfig: true,
            gamifiedSettings: true,
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
            const checklistItems = (assignment.checklists || []) as Record<string, any>[];
            if (!Array.isArray(checklistItems)) return sum;
            return sum + checklistItems.reduce((cSum, item, i) => {
                const isChecked = (score & (1 << i)) !== 0;
                const points = typeof item === 'object' ? (item.points || 0) : 1;
                return isChecked ? cSum + points : cSum;
            }, 0);
        }
        return sum + score;
    }, 0);

    // 3. Get currently active events
    const settings = (student.classroom?.gamifiedSettings as Record<string, any>) || {};
    const events = (settings.events || []) as Record<string, any>[];
    const now = new Date();

    // 4. Daily Refill Logic (Stamina & Mana)
    // Defensive: handle nulls for existing records
    let stamina = student.stamina ?? 3;
    let mana = student.mana ?? 50;
    const lastRefill = student.lastStaminaRefill ? new Date(student.lastStaminaRefill) : new Date(0);
    const isNewDay = now.toDateString() !== lastRefill.toDateString();

    if (isNewDay) {
        stamina = student.maxStamina; // Reset to daily max
        mana = Math.min(100, mana + 20); // Regain 20 mana per day (or define max)
    }

    const activeEvents = events.filter(e => new Date(e.startAt) <= now && new Date(e.endAt) >= now);

    // 4. Server-side validation (Anti-Cheat)
    const serverCalc = IdleEngine.calculateCurrentResources({
        ...student,
        points: academicTotal 
    }, activeEvents);
    
    // Allow a margin for network latency/clock drift (1% of total or 100 gold, whichever is larger)
    const margin = Math.max(100, serverCalc.stats.gold * 0.01);
    const maxAllowedGold = serverCalc.stats.gold + margin; 
    
    if (clientGold > maxAllowedGold) {
      console.warn(`[Anti-Cheat] Potential gold manipulation detected for student ${student.id}. Client: ${clientGold}, Max Allowed: ${maxAllowedGold}`);
    }

    const verifiedGold = Math.min(clientGold, maxAllowedGold);

    // 5. Update the database atomically
    const updatedStudent = await db.student.update({
      where: { id: student.id },
      data: {
        gameStats: {
          ...(student.gameStats as Record<string, any> || {}),
          gold: verifiedGold,
        },
        stamina,
        mana,
        lastStaminaRefill: isNewDay ? now : (student.lastStaminaRefill || now),
        lastSyncTime: now,
      },
    });

    // 6. Check for new achievements (Background or inline)
    const newlyUnlocked = await checkAndGrantAchievements(student.id);

    return NextResponse.json({
      success: true,
      gold: verifiedGold,
      stamina: updatedStudent.stamina,
      maxStamina: updatedStudent.maxStamina,
      mana: updatedStudent.mana,
      lastSyncTime: updatedStudent.lastSyncTime,
      newlyUnlocked: newlyUnlocked.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        goldReward: a.goldReward
      }))
    });
  } catch (error) {
    console.error("Error syncing student resources:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
