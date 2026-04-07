export type QuizReviewMode = "end_only" | "never";

/** Global default from environment (fallback when classroom/assignment unset). */
export function getQuizReviewMode(): QuizReviewMode {
  const raw = process.env.QUIZ_REVIEW_MODE?.trim().toLowerCase();
  if (raw === "never") return "never";
  return "end_only";
}

export function parseQuizReviewModeStored(
  value: string | null | undefined
): QuizReviewMode | null {
  if (value == null || value === "") return null;
  const t = String(value).trim().toLowerCase();
  if (t === "never") return "never";
  if (t === "end_only") return "end_only";
  return null;
}

export function resolveQuizReviewMode(opts: {
  assignmentMode?: string | null;
  classroomMode?: string | null;
}): QuizReviewMode {
  const fromAssign = parseQuizReviewModeStored(opts.assignmentMode);
  if (fromAssign) return fromAssign;
  const fromClass = parseQuizReviewModeStored(opts.classroomMode);
  if (fromClass) return fromClass;
  return getQuizReviewMode();
}

export type ParsedQuizReviewModeField =
  | { ok: true; value: QuizReviewMode | null | undefined }
  | { ok: false };

/**
 * Parse JSON body field for classroom/assignment PATCH or assignment POST.
 * undefined = omit update; null / "" = store null (inherit).
 */
export function parseQuizReviewModeFromRequest(raw: unknown): ParsedQuizReviewModeField {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false };
  const t = raw.trim().toLowerCase();
  if (t === "never") return { ok: true, value: "never" };
  if (t === "end_only") return { ok: true, value: "end_only" };
  return { ok: false };
}
