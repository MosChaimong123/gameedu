import { dbAssignmentTypeToFormType } from "@/lib/assignment-type";

/**
 * ตรวจค่าคะแนนที่ครูใส่ในตาราง / manual-scores ให้สอดคล้องประเภทภารกิจ
 */
export function parseAndValidateManualScore(
  assignmentType: string,
  maxScore: number,
  checklists: unknown,
  score: unknown
): { ok: true; scoreInt: number } | { ok: false; message: string } {
  if (score === null || score === undefined) {
    return { ok: false, message: "Missing score" };
  }

  const numeric =
    typeof score === "number"
      ? score
      : typeof score === "string"
        ? Number.parseInt(score, 10)
        : NaN;

  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    return { ok: false, message: "Score must be a number" };
  }

  const scoreInt = Math.trunc(numeric);
  if (scoreInt !== numeric) {
    return { ok: false, message: "Score must be a whole number" };
  }

  const formType = dbAssignmentTypeToFormType(assignmentType);

  if (formType === "checklist") {
    const items = Array.isArray(checklists) ? checklists : [];
    const n = items.length;
    const maxMask =
      n <= 0 ? 0 : n >= 53 ? Number.MAX_SAFE_INTEGER : 2 ** n - 1;

    if (scoreInt < 0 || scoreInt > maxMask) {
      return {
        ok: false,
        message:
          n <= 0
            ? "Checklist has no items; score must be 0"
            : `Checklist score must be between 0 and ${maxMask}`,
      };
    }
    return { ok: true, scoreInt };
  }

  const rawMax =
    typeof maxScore === "number" && Number.isFinite(maxScore) ? maxScore : 100;
  const max = Math.max(0, Math.trunc(rawMax));
  if (scoreInt < 0 || scoreInt > max) {
    return {
      ok: false,
      message: `Score must be between 0 and ${max}`,
    };
  }

  return { ok: true, scoreInt };
}
