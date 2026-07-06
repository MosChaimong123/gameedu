import { dbAssignmentTypeToFormType } from "@/lib/assignment-type";

export const MANUAL_SCORE_MISSING = "manualScoreMissing";
export const MANUAL_SCORE_NOT_NUMBER = "manualScoreNotNumber";
export const MANUAL_SCORE_NOT_WHOLE = "manualScoreNotWhole";
export const MANUAL_SCORE_CHECKLIST_EMPTY = "manualScoreChecklistEmpty";
export const MANUAL_SCORE_CHECKLIST_RANGE = "manualScoreChecklistRange";
export const MANUAL_SCORE_RANGE = "manualScoreRange";

/**
 * ตรวจค่าคะแนนที่ครูใส่ในตาราง / manual-scores ให้สอดคล้องประเภทภารกิจ
 */
export function parseAndValidateManualScore(
  assignmentType: string,
  maxScore: number,
  checklists: unknown,
  score: unknown
): { ok: true; score: number } | { ok: false; message: string } {
  if (score === null || score === undefined) {
    return { ok: false, message: MANUAL_SCORE_MISSING };
  }
  if (typeof score === "string" && score.trim() === "") {
    return { ok: false, message: MANUAL_SCORE_NOT_NUMBER };
  }

  const numeric =
    typeof score === "number"
      ? score
      : typeof score === "string"
        ? Number(score.trim())
        : NaN;

  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    return { ok: false, message: MANUAL_SCORE_NOT_NUMBER };
  }

  const formType = dbAssignmentTypeToFormType(assignmentType);

  if (formType === "checklist") {
    const scoreInt = Math.trunc(numeric);
    if (scoreInt !== numeric) {
      return { ok: false, message: MANUAL_SCORE_NOT_WHOLE };
    }

    const items = Array.isArray(checklists) ? checklists : [];
    const n = items.length;
    const maxMask =
      n <= 0 ? 0 : n >= 53 ? Number.MAX_SAFE_INTEGER : 2 ** n - 1;

    if (scoreInt < 0 || scoreInt > maxMask) {
      return {
        ok: false,
        message:
          n <= 0
            ? MANUAL_SCORE_CHECKLIST_EMPTY
            : `${MANUAL_SCORE_CHECKLIST_RANGE}:${maxMask}`,
      };
    }
    return { ok: true, score: scoreInt };
  }

  const scoreRoundedToCents = Math.round(numeric * 100);
  if (Math.abs(scoreRoundedToCents - numeric * 100) > Number.EPSILON * 100) {
    return { ok: false, message: MANUAL_SCORE_NOT_WHOLE };
  }
  const normalizedScore = scoreRoundedToCents / 100;

  const rawMax =
    typeof maxScore === "number" && Number.isFinite(maxScore) ? maxScore : 100;
  const max = Math.max(0, rawMax);
  if (normalizedScore < 0 || normalizedScore > max) {
    return {
      ok: false,
      message: `${MANUAL_SCORE_RANGE}:${max}`,
    };
  }

  return { ok: true, score: normalizedScore };
}
