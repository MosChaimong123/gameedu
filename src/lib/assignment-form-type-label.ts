import type { AssignmentFormType } from "@/lib/assignment-type";

/** Localized assignment type label (score / checklist / quiz). */
export function assignmentFormTypeLabel(
    t: (key: string, params?: Record<string, string | number>) => string,
    formType: AssignmentFormType
): string {
    if (formType === "checklist") return t("assignmentFormTypeChecklist");
    if (formType === "quiz") return t("assignmentFormTypeQuiz");
    return t("assignmentFormTypeScore");
}
