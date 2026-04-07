import { dbAssignmentTypeToFormType } from "@/lib/assignment-type";

/** รายการเช็คลิสต์จาก JSON / Prisma — สายอักขระเดิมนับน้ำหนัก 1 ต่อช่องที่ติ๊ก */
export type ChecklistItemLike = string | { text?: string; points?: number } | null | undefined;

export type MinimalAssignmentForAcademic = {
  id: string;
  type?: string | null;
  checklists?: unknown;
};

export type MinimalSubmissionForAcademic = {
  assignmentId: string;
  score: number;
};

/**
 * คะแนนวิชาการจาก bitmask เช็คลิสต์ (ผลรวมน้ำหนักของช่องที่ติ๊ก)
 * ต้องสอดคล้องกับการคำนวณแรงค์บน `student/[code]/page.tsx`
 */
export function checklistCheckedScore(
  bitmask: number,
  checklistItems: ChecklistItemLike[] | null | undefined
): number {
  if (!Array.isArray(checklistItems)) return 0;
  return checklistItems.reduce((sum, item, i) => {
    if ((bitmask & (1 << i)) === 0) return sum;
    if (typeof item === "object" && item !== null) {
      return sum + (item.points || 0);
    }
    return sum + 1;
  }, 0);
}

/** จำนวนช่องที่ติ๊กในเช็คลิสต์ */
export function checklistCheckedCount(
  bitmask: number,
  checklistItems: ChecklistItemLike[] | null | undefined
): number {
  if (!Array.isArray(checklistItems)) return 0;
  let count = 0;
  for (let i = 0; i < checklistItems.length; i++) {
    if ((bitmask & (1 << i)) !== 0) count++;
  }
  return count;
}

/**
 * รวมแต้มเลื่อนยศ (academic) จากงานในห้อง + ผลส่งงานที่มีเท่านั้น (ไม่ส่ง = ไม่นับ)
 */
export function sumAcademicTotal(
  assignments: MinimalAssignmentForAcademic[],
  submissions: MinimalSubmissionForAcademic[]
): number {
  const byAssignment = new Map(submissions.map((s) => [s.assignmentId, s.score]));
  return assignments.reduce((sum, assignment) => {
    const raw = byAssignment.get(assignment.id);
    if (raw === undefined) return sum;
    if (dbAssignmentTypeToFormType(assignment.type) === "checklist") {
      return (
        sum +
        checklistCheckedScore(
          raw,
          assignment.checklists as ChecklistItemLike[] | null | undefined
        )
      );
    }
    return sum + raw;
  }, 0);
}
