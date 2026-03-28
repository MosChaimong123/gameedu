import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";
import { checkAndGrantAchievements } from "@/lib/game/achievement-engine";
import { applyJobSkillUnlocksOnLevelUp } from "@/lib/game/job-system";

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
    void lastSyncTime;

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

    // 4. Stamina Time-Based Regen + Daily Mana Refill
    const STAMINA_REGEN_INTERVAL_MS = 2 * 60 * 60 * 1000; // 1 stamina per 2 hours
    const MANA_MAX = 200;
    const MANA_REGEN_PER_DAY = 40;

    // Existing students may have old maxStamina=3 — upgrade them silently
    const effectiveMaxStamina = Math.max(student.maxStamina ?? 10, 10);
    let stamina = Math.min(student.stamina ?? effectiveMaxStamina, effectiveMaxStamina);
    let mana = student.mana ?? 50;

    const lastRefill = student.lastStaminaRefill ? new Date(student.lastStaminaRefill) : new Date(0);
    const msElapsed = now.getTime() - lastRefill.getTime();
    const staminaToAdd = Math.floor(msElapsed / STAMINA_REGEN_INTERVAL_MS);

    // Advance lastStaminaRefill by consumed regen ticks (not full elapsed time)
    // so the remainder carries forward correctly
    let newLastRefill = lastRefill;
    if (staminaToAdd > 0 && stamina < effectiveMaxStamina) {
        const added = Math.min(staminaToAdd, effectiveMaxStamina - stamina);
        stamina = stamina + added;
        newLastRefill = new Date(lastRefill.getTime() + added * STAMINA_REGEN_INTERVAL_MS);
    }
    // If stamina is already full, anchor refill to now (so countdown restarts when they spend stamina)
    if (stamina >= effectiveMaxStamina) {
        newLastRefill = now;
    }

    // Mana: still daily regen (every new calendar day)
    const isNewDay = now.toDateString() !== lastRefill.toDateString();
    if (isNewDay) {
        mana = Math.min(MANA_MAX, mana + MANA_REGEN_PER_DAY);
    }

    // Compute when next stamina regen will arrive (for UI countdown)
    const nextStaminaRegenAt = stamina < effectiveMaxStamina
        ? new Date(newLastRefill.getTime() + STAMINA_REGEN_INTERVAL_MS)
        : null; // null = already full

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

    const updatedJobSkills =
      xpSync.leveledUp
        ? applyJobSkillUnlocksOnLevelUp({
            jobClass: student.jobClass ?? null,
            jobTier: student.jobTier ?? null,
            advanceClass: student.advanceClass ?? null,
            oldLevel: currentStats.level ?? 1,
            newLevel: xpSync.level ?? currentStats.level ?? 1,
            currentJobSkills: Array.isArray(student.jobSkills) ? (student.jobSkills as string[]) : [],
          })
        : undefined;

    // 5b. Login Streak Logic
    const today = now.toISOString().split("T")[0];
    const lastLoginDate = (currentStats as any).lastLoginDate as string | undefined;
    const currentStreak = ((currentStats as any).loginStreak as number) ?? 0;

    let newStreak = currentStreak;
    let streakBonus = 0;
    let streakBonusMaterial: string | null = null;
    const isNewLogin = lastLoginDate !== today;

    if (isNewLogin) {
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
      newStreak = lastLoginDate === yesterday ? currentStreak + 1 : 1;
      if (newStreak === 3)  { streakBonus = 50; }
      if (newStreak === 7)  { streakBonus = 100; streakBonusMaterial = "Wolf Fang"; }
      if (newStreak === 14) { streakBonus = 150; streakBonusMaterial = "Dragon Scale"; }
      if (newStreak === 30) { streakBonus = 300; streakBonusMaterial = "Phoenix Feather"; }
      else if (newStreak > 30 && newStreak % 7 === 0) { streakBonus = 100; }
    }

    const streakGold = (verifiedGold) + streakBonus;

    // 6. Update the database atomically
    const updatedStudent = await db.student.update({
      where: { id: student.id },
      data: {
        stamina,
        maxStamina: effectiveMaxStamina,
        mana,
        lastStaminaRefill: newLastRefill,
        gameStats: {
          ...currentStats,
          gold: streakGold,
          level: xpSync.level,
          xp: xpSync.xp,
          loginStreak: newStreak,
          lastLoginDate: isNewLogin ? today : (lastLoginDate ?? today),
        } as any,
        lastSyncTime: now,
        ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {}),
      },
    });

    // Award streak material bonus (fire-and-forget)
    if (isNewLogin && streakBonusMaterial) {
      void db.material.upsert({
        where: { studentId_type: { studentId: student.id, type: streakBonusMaterial } },
        update: { quantity: { increment: 1 } },
        create: { studentId: student.id, type: streakBonusMaterial, quantity: 1 },
      }).catch(() => {});
    }

    // 7. Check for new achievements (Background or inline)
    const newlyUnlocked = await checkAndGrantAchievements(student.id);

    return NextResponse.json({
      success: true,
      gold: streakGold,
      stamina: updatedStudent.stamina,
      maxStamina: updatedStudent.maxStamina,
      mana: updatedStudent.mana,
      lastSyncTime: updatedStudent.lastSyncTime,
      nextStaminaRegenAt: nextStaminaRegenAt?.toISOString() ?? null,
      loginStreak: newStreak,
      streakBonus,
      streakBonusMaterial,
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
