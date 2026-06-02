import type { PlanLimits } from "@/constants/plan-limits";
import { getLimitsForUser } from "@/lib/plan/plan-access";

export type LinePlanTeacher = {
    role?: string | null;
    plan?: string | null;
    planStatus?: string | null;
    planExpiry?: Date | string | number | null;
};

export type LineFeatureKey =
    | "lineSubmission"
    | "lineAutoReminders"
    | "lineExport"
    | "lineAiPreliminaryGrading";

export function getLinePlanLimitsForTeacher(teacher: LinePlanTeacher | null | undefined): PlanLimits {
    return getLimitsForUser(
        teacher?.role ?? "TEACHER",
        teacher?.plan ?? "FREE",
        teacher?.planStatus,
        teacher?.planExpiry
    );
}

export function canUseLineFeature(
    teacher: LinePlanTeacher | null | undefined,
    feature: LineFeatureKey
): boolean {
    return Boolean(getLinePlanLimitsForTeacher(teacher)[feature]);
}

export function getLineCreatedAssignmentMonthlyLimit(teacher: LinePlanTeacher | null | undefined): number {
    return getLinePlanLimitsForTeacher(teacher).lineCreatedAssignmentsPerMonth;
}
