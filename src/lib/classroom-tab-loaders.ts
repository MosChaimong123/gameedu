import { getLocalizedErrorMessageFromResponse, tryLocalizeFetchNetworkFailureMessage } from "@/lib/ui-error-messages";
import type { Language } from "@/lib/translations";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export type AttendanceHistoryRecord = {
  id: string;
  studentId: string;
  student: {
    name: string;
    avatar: string | null;
  };
  status: string;
  date: string;
};

export type AttendanceHistoryLoadResult =
  | { ok: true; records: AttendanceHistoryRecord[] }
  | { ok: false; message: string };

export async function loadAttendanceHistory(
  fetchImpl: typeof fetch,
  classId: string,
  selectedDate: string,
  t: TranslateFn,
  language: Language
): Promise<AttendanceHistoryLoadResult> {
  try {
    const res = await fetchImpl(`/api/classrooms/${classId}/attendance/history?date=${selectedDate}`);
    if (!res.ok) {
      return {
        ok: false,
        message: await getLocalizedErrorMessageFromResponse(
          res,
          "toastGenericError",
          t,
          language
        ),
      };
    }

    const data = (await res.json()) as { records?: AttendanceHistoryRecord[] };
    return {
      ok: true,
      records: Array.isArray(data.records) ? data.records : [],
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : null;
    return {
      ok: false,
      message: tryLocalizeFetchNetworkFailureMessage(raw, t) ?? t("toastGenericError"),
    };
  }
}

export type AnalyticsHistoryEntry = {
  createdAt?: string;
  reason?: string;
  value?: number;
};

export type AnalyticsStudentStat = {
  name: string;
  nickname?: string | null;
  behaviorPoints: number;
  totalPositive: number;
  totalNeedsWork: number;
  achievementCount: number;
  attendance: string;
};

export type AssignmentStat = {
  id: string;
  name: string;
  type: string | null;
  maxScore: number;
  passScore: number | null;
  submittedCount: number;
  totalStudents: number;
  submissionRate: number;
  avgScore: number;
  passCount: number | null;
  notSubmitted: { id: string; name: string }[];
};

export type AnalyticsData = {
  summary: { name: string; value: number; fill: string }[];
  growthData: { date: string; points: number }[];
  skillDistribution: { name: string; count: number }[];
  recentHistory: AnalyticsHistoryEntry[];
  studentStats: AnalyticsStudentStat[];
  attendanceSummary: { status?: string; name?: string; value: number; fill: string }[];
  achievementSummary: {
    total: number;
    avgPerStudent: number;
  };
  achievementDistribution: { id: string; count: number }[];
  assignmentStats: AssignmentStat[];
};

export type AnalyticsLoadResult =
  | { ok: true; data: AnalyticsData }
  | { ok: false; message: string };

export async function loadClassroomAnalytics(
  fetchImpl: typeof fetch,
  classId: string,
  t: TranslateFn,
  language: Language
): Promise<AnalyticsLoadResult> {
  try {
    const res = await fetchImpl(`/api/classrooms/${classId}/analytics`);
    if (!res.ok) {
      return {
        ok: false,
        message: await getLocalizedErrorMessageFromResponse(
          res,
          "analyticsLoadFailed",
          t,
          language
        ),
      };
    }

    return {
      ok: true,
      data: (await res.json()) as AnalyticsData,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : null;
    return {
      ok: false,
      message: tryLocalizeFetchNetworkFailureMessage(raw, t) ?? t("analyticsLoadFailed"),
    };
  }
}
