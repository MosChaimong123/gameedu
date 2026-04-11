/** Form / API uses "score"; Prisma schema historically used "standard" for the same mode. */
export type AssignmentFormType = "score" | "checklist" | "quiz";

export function dbAssignmentTypeToFormType(
  dbType: string | null | undefined
): AssignmentFormType {
  const t = String(dbType ?? "")
    .toLowerCase()
    .trim();
  if (t === "checklist") return "checklist";
  if (t === "quiz") return "quiz";
  // "standard", "score", or unknown → โหมดคะแนน
  return "score";
}

/** คลาสสีป้ายให้สอดคล้องกับโมดัลครู */
export function assignmentTypeBadgeClassName(formType: AssignmentFormType): string {
  switch (formType) {
    case "checklist":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "quiz":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-blue-200 bg-blue-50 text-blue-800";
  }
}
