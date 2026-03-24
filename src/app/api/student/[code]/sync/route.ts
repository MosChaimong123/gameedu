import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";
import { checkAndGrantAchievements } from "@/lib/game/achievement-engine";

type SubmissionLite = {
  assignmentId: string;
  score: number;
};

type ChecklistLite = {
  points?: number | null;
};

type AssignmentLite = {
  id: string;
  type: string;
  checklists: unknown;
};

type EventLite = {
  type?: string | null;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  multiplier?: number | null;
};

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
    const submissionMap = new Map<string, number>(
      student.submissions.map((s: SubmissionLite) => [s.assignmentId, s.score || 0])
    );
    const academicTotal = (student.classroom?.assignments || []).reduce((sum: number, assignment: AssignmentLite) => {
        const score = submissionMap.get(assignment.id);
        if (score === undefined) return sum;

        if (assignment.type === 'checklist') {
            const checklistItems = (assignment.checklists || []) as ChecklistLite[];
            if (!Array.isArray(checklistItems)) return sum;
            return sum + checklistItems.reduce((cSum, item, i) => {
                const isChecked = ((score || 0) & (1 << i)) !== 0;
                const points = typeof item === "object" && item ? (item.points || 0) : 1;
                return isChecked ? cSum + points : cSum;
            }, 0);
        }
        return sum + (score as number || 0);
    }, 0);

    // 3. Get currently active events
    const settings =
      student.classroom?.gamifiedSettings && typeof student.classroom.gamifiedSettings === "object"
        ? (student.classroom.gamifiedSettings as { events?: EventLite[] })
        : {};
    const events = settings.events || [];
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

    const activeEvents = events.filter((e) => new Date(e.startAt || 0) <= now && new Date(e.endAt || 0) >= now);

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

    // 5. XP and Level-Up Sync
    const currentStats = IdleEngine.parseGameStats(student.gameStats);
    console.log(`[SYNC_DEBUG] Student:${student.loginCode}, Level:${currentStats.level}, XP:${currentStats.xp}`);
    const xpSync = IdleEngine.calculateXpGain(currentStats, 0);
    
    if (xpSync.leveledUp) {
      console.log(`[SYNC_DEBUG] LEVEL UP DETECTED for ${student.loginCode}: ${currentStats.level} -> ${xpSync.level}`);
    }

    // 6. Update the database atomically
    const updatedStudent = await db.student.update({
      where: { id: student.id },
      data: {
        stamina,
        mana,
        lastStaminaRefill: isNewDay ? now : student.lastStaminaRefill,
        gameStats: {
          ...currentStats,
          gold: verifiedGold,
          level: xpSync.level,
          xp: xpSync.xp
        } as any,
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
      newlyUnlocked: newlyUnlocked.map((a) => ({
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
