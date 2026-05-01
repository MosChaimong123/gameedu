"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Download, SlidersHorizontal, AlertTriangle, CheckCircle2, Users, ShieldCheck } from "lucide-react";

type LedgerRow = {
  id: string;
  studentId: string;
  type: string;
  source: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  student?: {
    name?: string | null;
    nickname?: string | null;
  } | null;
};

type LedgerResponse = {
  summary: {
    rowCount: number;
    totalEarned: number;
    totalSpent: number;
    net: number;
  };
  transactions: LedgerRow[];
};

type EconomyAnalyticsResponse = {
  totals: {
    earned: number;
    spent: number;
    net: number;
  };
  daily: { date: string; earned: number; spent: number; net: number }[];
  bySource: Record<string, number>;
  topStudents: { studentId: string; name: string; earned: number; spent: number; net: number }[];
};

type EconomyReconciliationResponse = {
  summary: {
    studentCount: number;
    okCount: number;
    warningCount: number;
    mismatchCount: number;
    issueCount: number;
    transactionCount: number;
    currentGoldTotal: number;
    expectedGoldTotal: number;
    unreconciledGoldTotal: number;
  };
  students: {
    studentId: string;
    name: string;
    nickname: string | null;
    currentGold: number;
    expectedGold: number | null;
    status: "ok" | "warning" | "mismatch";
    issues: {
      type: string;
      severity: "warning" | "error";
      expected: number | null;
      actual: number;
      message: string;
    }[];
  }[];
};

type NegamonRewardAuditResponse = {
  summary: {
    eventCount: number;
    appliedEventCount: number;
    skippedEventCount: number;
    recipientCount: number;
    totalExp: number;
    appliedLinkedIdentityCount: number;
    appliedNameFallbackCount: number;
    skippedPlayerCount: number;
    skippedAmbiguousNameCount: number;
    skippedInvalidStudentIdCount: number;
    skippedNoMatchCount: number;
  };
  events: {
    action: string;
    status: "success" | "rejected" | "error";
    reason: string | null;
    timestamp: string;
    metadata: Record<string, unknown>;
  }[];
};

type NegamonRewardAuditSkippedPlayer = {
  name?: string;
  rank?: number;
  reason?: string;
  studentId?: string;
  finalScore?: number;
  exp?: number;
};

type NegamonRewardAuditRecipient = {
  studentId?: string;
  exp?: number;
  rank?: number;
  finalScore?: number;
  identitySource?: string;
};

type NegamonRewardRemediationResponse = {
  summary: {
    eventCount: number;
    studentCount: number;
    nameChangeCount: number;
    nicknameChangeCount: number;
    gamePinCount: number;
  };
  events: {
    action: string;
    status: "success" | "rejected" | "error";
    targetId: string | null;
    timestamp: string;
    metadata: Record<string, unknown>;
  }[];
};

type NegamonRewardEffectivenessResponse = {
  summary: {
    gamePinCount: number;
    pinsWithSkips: number;
    pinsWithRemediation: number;
    pinsNeedingFollowUp: number;
    totalRecipients: number;
    totalSkippedPlayers: number;
    totalRemediationEvents: number;
  };
  gamePins: {
    gamePin: string;
    rewardEventCount: number;
    appliedEventCount: number;
    skippedEventCount: number;
    recipientCount: number;
    skippedPlayerCount: number;
    remediationEventCount: number;
    remediatedStudentCount: number;
    resolvedSkippedCount: number;
    unresolvedSkippedCount: number;
    latestRewardAt: string;
    latestRemediationAt: string | null;
  }[];
};

type NegamonRewardResyncResponse = {
  gamePin: string;
  requestedByUserId: string;
  appliedCount: number;
  skippedCount: number;
  unresolvedCount: number;
  reason: "applied" | "already_awarded" | "claim_already_exists" | "snapshot_missing" | "no_audit_event";
  appliedRecipients: {
    studentId: string;
    exp: number;
    rank: number;
    finalScore: number;
    identitySource: string;
    behaviorPointsBefore: number;
    behaviorPointsAfter: number;
  }[];
  skippedPlayers: NegamonRewardAuditSkippedPlayer[];
};

type EconomyLedgerStudentOption = {
  id: string;
  name: string;
  nickname?: string | null;
};

const SOURCE_OPTIONS = [
  "",
  "battle",
  "shop",
  "quest",
  "checkin",
  "passive_gold",
  "admin_adjustment",
  "migration",
] as const;

const TYPE_OPTIONS = ["", "earn", "spend", "adjust"] as const;
type AdjustmentScope = "single" | "selected" | "all";

function studentLabel(student: EconomyLedgerStudentOption): string {
  return student.nickname ? `${student.name} (${student.nickname})` : student.name;
}

function studentNameById(students: EconomyLedgerStudentOption[], studentId: string) {
  const student = students.find((item) => item.id === studentId);
  return student ? studentLabel(student) : studentId;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function metadataArray<T>(metadata: Record<string, unknown>, key: string): T[] {
  const value = metadata[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function buildStudentActionHref(args: {
  classId: string;
  playerName: string;
  studentId?: string;
  rewardGamePin?: string | null;
  action: "manage" | "history";
}) {
  const params = new URLSearchParams({ tab: "classroom" });
  if (args.studentId) {
    params.set(args.action === "manage" ? "manageStudentId" : "historyStudentId", args.studentId);
  } else {
    params.set("studentLookup", args.playerName);
  }
  if (args.rewardGamePin) {
    params.set("rewardGamePin", args.rewardGamePin);
  }
  return `/dashboard/classrooms/${args.classId}?${params.toString()}`;
}

function skippedReasonLabel(reason: string | undefined, t: (key: string) => string) {
  switch (reason) {
    case "ambiguous_name":
      return t("negamonRewardAuditAmbiguous");
    case "invalid_student_id":
      return t("negamonRewardAuditInvalidId");
    case "no_match":
      return t("negamonRewardAuditNoMatch");
    case "duplicate_student":
      return t("negamonRewardAuditDuplicate");
    case "non_positive_exp":
      return t("negamonRewardAuditZeroExp");
    default:
      return reason ?? "-";
  }
}

export function ClassroomEconomyLedgerTab({
  classId,
  students = [],
}: {
  classId: string;
  students?: EconomyLedgerStudentOption[];
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [source, setSource] = useState<(typeof SOURCE_OPTIONS)[number]>("");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("");
  const [limit, setLimit] = useState("100");
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [reconciliationLoading, setReconciliationLoading] = useState(true);
  const [rewardAuditLoading, setRewardAuditLoading] = useState(true);
  const [rewardRemediationLoading, setRewardRemediationLoading] = useState(true);
  const [rewardEffectivenessLoading, setRewardEffectivenessLoading] = useState(true);
  const [resyncingGamePin, setResyncingGamePin] = useState<string | null>(null);
  const [rewardAuditGamePin, setRewardAuditGamePin] = useState("");
  const [rewardAuditReason, setRewardAuditReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [analytics, setAnalytics] = useState<EconomyAnalyticsResponse | null>(null);
  const [reconciliation, setReconciliation] = useState<EconomyReconciliationResponse | null>(null);
  const [rewardAudit, setRewardAudit] = useState<NegamonRewardAuditResponse | null>(null);
  const [rewardRemediation, setRewardRemediation] = useState<NegamonRewardRemediationResponse | null>(null);
  const [rewardEffectiveness, setRewardEffectiveness] =
    useState<NegamonRewardEffectivenessResponse | null>(null);
  const [rewardResyncResult, setRewardResyncResult] = useState<NegamonRewardResyncResponse | null>(null);
  const [adjustScope, setAdjustScope] = useState<AdjustmentScope>("single");
  const [adjustStudentId, setAdjustStudentId] = useState("");
  const [adjustStudentIds, setAdjustStudentIds] = useState<string[]>([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (studentId.trim()) params.set("studentId", studentId.trim());
    if (source) params.set("source", source);
    if (type) params.set("type", type);
    if (limit.trim()) params.set("limit", limit.trim());
    return params.toString();
  }, [studentId, source, type, limit]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classrooms/${classId}/economy/ledger${query ? `?${query}` : ""}`);
      if (!res.ok) {
        setError(t("economyLedgerLoadFailed"));
        setData(null);
        return;
      }
      const body = (await res.json()) as LedgerResponse;
      setData(body);
    } catch {
      setError(t("economyLedgerLoadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/economy/analytics?days=30`);
      if (!res.ok) {
        setAnalytics(null);
        return;
      }
      setAnalytics((await res.json()) as EconomyAnalyticsResponse);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadReconciliation = async () => {
    setReconciliationLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classId}/economy/reconciliation`);
      if (!res.ok) {
        setReconciliation(null);
        return;
      }
      setReconciliation((await res.json()) as EconomyReconciliationResponse);
    } catch {
      setReconciliation(null);
    } finally {
      setReconciliationLoading(false);
    }
  };

  const loadRewardAudit = async (options?: { gamePin?: string; reason?: string }) => {
    setRewardAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (options?.gamePin?.trim()) params.set("gamePin", options.gamePin.trim());
      if (options?.reason?.trim()) params.set("reason", options.reason.trim());
      const res = await fetch(`/api/classrooms/${classId}/negamon/reward-audit?${params.toString()}`);
      if (!res.ok) {
        setRewardAudit(null);
        return;
      }
      setRewardAudit((await res.json()) as NegamonRewardAuditResponse);
    } catch {
      setRewardAudit(null);
    } finally {
      setRewardAuditLoading(false);
    }
  };

  const loadRewardRemediation = async (options?: { gamePin?: string }) => {
    setRewardRemediationLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (options?.gamePin?.trim()) params.set("gamePin", options.gamePin.trim());
      const res = await fetch(`/api/classrooms/${classId}/negamon/reward-remediation?${params.toString()}`);
      if (!res.ok) {
        setRewardRemediation(null);
        return;
      }
      setRewardRemediation((await res.json()) as NegamonRewardRemediationResponse);
    } catch {
      setRewardRemediation(null);
    } finally {
      setRewardRemediationLoading(false);
    }
  };

  const loadRewardEffectiveness = async (options?: { gamePin?: string }) => {
    setRewardEffectivenessLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "8");
      if (options?.gamePin?.trim()) params.set("gamePin", options.gamePin.trim());
      const res = await fetch(`/api/classrooms/${classId}/negamon/reward-effectiveness?${params.toString()}`);
      if (!res.ok) {
        setRewardEffectiveness(null);
        return;
      }
      setRewardEffectiveness((await res.json()) as NegamonRewardEffectivenessResponse);
    } catch {
      setRewardEffectiveness(null);
    } finally {
      setRewardEffectivenessLoading(false);
    }
  };

  const toggleAdjustStudent = (id: string) => {
    setAdjustStudentIds((prev) =>
      prev.includes(id) ? prev.filter((studentId) => studentId !== id) : [...prev, id]
    );
  };

  const handleAdjustment = async () => {
    setAdjusting(true);
    setError(null);
    const selectedIds = adjustScope === "single"
      ? (adjustStudentId ? [adjustStudentId] : [])
      : adjustStudentIds;
    try {
      const res = await fetch(`/api/classrooms/${classId}/economy/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: adjustScope === "all" ? "all" : "selected",
          studentId: adjustScope === "single" ? adjustStudentId : undefined,
          studentIds: adjustScope === "selected" ? selectedIds : undefined,
          amount: Number(adjustAmount),
          reason: adjustReason,
        }),
      });
      if (!res.ok) {
        setError(t("economyLedgerAdjustFailed"));
        return;
      }
      setAdjustStudentId("");
      setAdjustStudentIds([]);
      setAdjustAmount("");
      setAdjustReason("");
      await Promise.all([load(), loadAnalytics(), loadReconciliation()]);
    } catch {
      setError(t("economyLedgerAdjustFailed"));
    } finally {
      setAdjusting(false);
    }
  };

  const handleRewardResync = async (gamePin: string) => {
    setResyncingGamePin(gamePin);
    try {
      const res = await fetch(`/api/classrooms/${classId}/negamon/reward-resync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gamePin }),
      });

      const body = (await res.json().catch(() => null)) as
        | NegamonRewardResyncResponse
        | null;

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: t("negamonRewardResyncFailedTitle"),
          description: t("negamonRewardResyncFailedDesc"),
        });
        return;
      }

      setRewardResyncResult(body);
      toast({
        title: t("negamonRewardResyncFinishedTitle"),
        description: t("negamonRewardResyncFinishedDesc", {
          applied: body?.appliedCount ?? 0,
          skipped: body?.skippedCount ?? 0,
          unresolved: body?.unresolvedCount ?? 0,
        }),
      });
      await Promise.all([
        loadRewardAudit({ gamePin: rewardAuditGamePin, reason: rewardAuditReason }),
        loadRewardRemediation({ gamePin: rewardAuditGamePin }),
        loadRewardEffectiveness({ gamePin: rewardAuditGamePin }),
      ]);
    } catch {
      toast({
        variant: "destructive",
        title: t("negamonRewardResyncFailedTitle"),
        description: t("negamonRewardResyncFailedDesc"),
      });
    } finally {
      setResyncingGamePin(null);
    }
  };

  const focusRewardGamePin = async (gamePin: string) => {
    setRewardAuditGamePin(gamePin);
    setRewardAuditReason("");
    if (rewardResyncResult?.gamePin !== gamePin) {
      setRewardResyncResult(null);
    }
    await Promise.all([
      loadRewardAudit({ gamePin, reason: "" }),
      loadRewardRemediation({ gamePin }),
      loadRewardEffectiveness({ gamePin }),
    ]);
  };

  useEffect(() => {
    void load();
    void loadAnalytics();
    void loadReconciliation();
    void loadRewardAudit({ gamePin: rewardAuditGamePin, reason: rewardAuditReason });
    void loadRewardRemediation({ gamePin: rewardAuditGamePin });
    void loadRewardEffectiveness({ gamePin: rewardAuditGamePin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportHref = `/api/classrooms/${classId}/economy/ledger/export${query ? `?${query}` : ""}`;
  const rewardAuditExportQuery = new URLSearchParams();
  if (rewardAuditGamePin.trim()) rewardAuditExportQuery.set("gamePin", rewardAuditGamePin.trim());
  if (rewardAuditReason.trim()) rewardAuditExportQuery.set("reason", rewardAuditReason.trim());
  const rewardAuditExportHref = `/api/classrooms/${classId}/negamon/reward-audit/export${
    rewardAuditExportQuery.toString() ? `?${rewardAuditExportQuery.toString()}` : ""
  }`;
  const maxDailyMagnitude = Math.max(
    1,
    ...(analytics?.daily ?? []).map((day) => Math.max(day.earned, day.spent, Math.abs(day.net)))
  );
  const reconciliationIssues = reconciliation?.students.filter((student) => student.status !== "ok") ?? [];
  const adjustmentAmountNumber = Number(adjustAmount);
  const adjustmentTargetCount =
    adjustScope === "all"
      ? students.length
      : adjustScope === "single"
        ? (adjustStudentId ? 1 : 0)
        : adjustStudentIds.length;
  const adjustmentTotal = Number.isFinite(adjustmentAmountNumber)
    ? adjustmentAmountNumber * adjustmentTargetCount
    : 0;
  const canApplyAdjustment =
    !adjusting &&
    Boolean(adjustAmount) &&
    Boolean(adjustReason.trim()) &&
    Number.isInteger(adjustmentAmountNumber) &&
    adjustmentAmountNumber !== 0 &&
    (adjustScope === "all" ||
      (adjustScope === "single" ? Boolean(adjustStudentId) : adjustStudentIds.length > 0));

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-slate-800">{t("economyLedgerTrendTitle")}</p>
              <p className="text-xs font-semibold text-slate-500">{t("economyLedgerTrendSubtitle")}</p>
            </div>
            {analyticsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
          </div>
          <div className="flex h-28 items-end gap-1">
            {(analytics?.daily ?? []).slice(-14).map((day) => (
              <div key={day.date} className="flex min-w-4 flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-emerald-400"
                  style={{ height: `${Math.max(4, (day.earned / maxDailyMagnitude) * 88)}px` }}
                  title={`${day.date} +${day.earned}`}
                />
                <div
                  className="w-full rounded-b bg-rose-400"
                  style={{ height: `${Math.max(0, (day.spent / maxDailyMagnitude) * 48)}px` }}
                  title={`${day.date} -${day.spent}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold">
            <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">+{analytics?.totals.earned ?? 0}</span>
            <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">-{analytics?.totals.spent ?? 0}</span>
            <span className="rounded bg-indigo-100 px-2 py-1 text-indigo-700">{analytics?.totals.net ?? 0}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-black text-slate-800">{t("economyLedgerTopStudents")}</p>
          <div className="space-y-2">
            {(analytics?.topStudents ?? []).slice(0, 5).map((student) => (
              <div key={student.studentId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="font-bold text-slate-700">{student.name}</span>
                <span className={student.net >= 0 ? "font-black text-emerald-600" : "font-black text-rose-600"}>
                  {student.net >= 0 ? `+${student.net}` : student.net}
                </span>
              </div>
            ))}
            {!analyticsLoading && (analytics?.topStudents.length ?? 0) === 0 ? (
              <p className="text-xs font-semibold text-slate-400">{t("economyLedgerEmpty")}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${reconciliation?.summary.issueCount ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {reconciliation?.summary.issueCount ? (
              <AlertTriangle className="h-4 w-4 text-amber-700" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            )}
            <p className={`text-sm font-black ${reconciliation?.summary.issueCount ? "text-amber-900" : "text-emerald-900"}`}>
              {t("economyReconciliationTitle")}
            </p>
          </div>
          {reconciliationLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
        </div>
        <div className="grid gap-2 text-xs font-bold sm:grid-cols-4">
          <span className="rounded bg-white/70 px-2 py-1 text-slate-700">
            {t("economyReconciliationStudents")}: {reconciliation?.summary.studentCount ?? 0}
          </span>
          <span className="rounded bg-white/70 px-2 py-1 text-emerald-700">
            {t("economyReconciliationOk")}: {reconciliation?.summary.okCount ?? 0}
          </span>
          <span className="rounded bg-white/70 px-2 py-1 text-amber-700">
            {t("economyReconciliationIssues")}: {reconciliation?.summary.issueCount ?? 0}
          </span>
          <span className="rounded bg-white/70 px-2 py-1 text-slate-700">
            {t("economyReconciliationGold")}: {reconciliation?.summary.currentGoldTotal ?? 0}
          </span>
        </div>
        {reconciliationIssues.length > 0 ? (
          <div className="mt-3 space-y-2">
            {reconciliationIssues.slice(0, 4).map((student) => (
              <div key={student.studentId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs">
                <span className="font-bold text-slate-800">{student.nickname ? `${student.name} (${student.nickname})` : student.name}</span>
                <span className={student.status === "mismatch" ? "font-black text-rose-600" : "font-black text-amber-700"}>
                  {student.issues[0]?.type ?? student.status}: {student.currentGold}
                  {student.expectedGold !== null ? ` / ${student.expectedGold}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : !reconciliationLoading ? (
          <p className="mt-3 text-xs font-semibold text-emerald-700">{t("economyReconciliationHealthy")}</p>
        ) : null}
      </div>

      <div className={`rounded-xl border p-4 ${rewardAudit?.summary.skippedPlayerCount ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-700" />
            <div>
              <p className="text-sm font-black text-slate-900">{t("negamonRewardAuditTitle")}</p>
              <p className="text-xs font-semibold text-slate-500">{t("negamonRewardAuditSubtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={rewardAuditExportHref}>
              <Button type="button" variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                {t("negamonRewardAuditExport")}
              </Button>
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadRewardAudit({ gamePin: rewardAuditGamePin, reason: rewardAuditReason })}
              disabled={rewardAuditLoading}
            >
              {rewardAuditLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("teacherCommandRefresh")}
            </Button>
          </div>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,160px)_minmax(0,220px)_auto_auto]">
          <Input
            value={rewardAuditGamePin}
            onChange={(e) => setRewardAuditGamePin(e.target.value)}
            placeholder={t("negamonRewardAuditGamePin")}
          />
          <select
            value={rewardAuditReason}
            onChange={(e) => setRewardAuditReason(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">{t("negamonRewardAuditAllReasons")}</option>
            <option value="no_awards">no_awards</option>
            <option value="already_awarded">already_awarded</option>
            <option value="claim_already_exists">claim_already_exists</option>
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void loadRewardAudit({ gamePin: rewardAuditGamePin, reason: rewardAuditReason });
              void loadRewardRemediation({ gamePin: rewardAuditGamePin });
              void loadRewardEffectiveness({ gamePin: rewardAuditGamePin });
            }}
            disabled={rewardAuditLoading}
          >
            {t("economyLedgerApply")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setRewardAuditGamePin("");
              setRewardAuditReason("");
              void loadRewardAudit({ gamePin: "", reason: "" });
              void loadRewardRemediation({ gamePin: "" });
              void loadRewardEffectiveness({ gamePin: "" });
            }}
            disabled={rewardAuditLoading && !rewardAuditGamePin && !rewardAuditReason}
          >
            {t("negamonRewardAuditClearFilters")}
          </Button>
        </div>
        {rewardAuditGamePin ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-xs">
            <span className="font-black text-sky-900">
              {t("negamonRewardFocusLabel")}: #{rewardAuditGamePin}
            </span>
            <span className="font-semibold text-slate-500">
              {t("negamonRewardFocusHint")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRewardAuditGamePin("");
                setRewardAuditReason("");
                setRewardResyncResult(null);
                void Promise.all([
                  loadRewardAudit({ gamePin: "", reason: "" }),
                  loadRewardRemediation({ gamePin: "" }),
                  loadRewardEffectiveness({ gamePin: "" }),
                ]);
              }}
            >
              {t("negamonRewardFocusClear")}
            </Button>
          </div>
        ) : null}
        <div className="grid gap-2 text-xs font-bold sm:grid-cols-4">
          <span className="rounded bg-white/80 px-2 py-1 text-slate-700">
            {t("negamonRewardAuditEvents")}: {rewardAudit?.summary.eventCount ?? 0}
          </span>
          <span className="rounded bg-white/80 px-2 py-1 text-emerald-700">
            {t("negamonRewardAuditApplied")}: {rewardAudit?.summary.appliedEventCount ?? 0}
          </span>
          <span className="rounded bg-white/80 px-2 py-1 text-amber-700">
            {t("negamonRewardAuditSkipped")}: {rewardAudit?.summary.skippedEventCount ?? 0}
          </span>
          <span className="rounded bg-white/80 px-2 py-1 text-indigo-700">
            EXP: {rewardAudit?.summary.totalExp ?? 0}
          </span>
          <span className="rounded bg-white/80 px-2 py-1 text-slate-700">
            {t("negamonRewardAuditRecipients")}: {rewardAudit?.summary.recipientCount ?? 0}
          </span>
          <span className="rounded bg-white/80 px-2 py-1 text-emerald-700">
            {t("negamonRewardAuditLinked")}: {rewardAudit?.summary.appliedLinkedIdentityCount ?? 0}
          </span>
          <span className="rounded bg-white/80 px-2 py-1 text-sky-700">
            {t("negamonRewardAuditFallback")}: {rewardAudit?.summary.appliedNameFallbackCount ?? 0}
          </span>
          <span className="rounded bg-white/80 px-2 py-1 text-rose-700">
            {t("negamonRewardAuditSkippedPlayers")}: {rewardAudit?.summary.skippedPlayerCount ?? 0}
          </span>
        </div>
        {(rewardAudit?.summary.skippedPlayerCount ?? 0) > 0 ? (
          <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-5">
            <span className="rounded bg-white/80 px-2 py-1 text-amber-700">
              {t("negamonRewardAuditAmbiguous")}: {rewardAudit?.summary.skippedAmbiguousNameCount ?? 0}
            </span>
            <span className="rounded bg-white/80 px-2 py-1 text-rose-700">
              {t("negamonRewardAuditInvalidId")}: {rewardAudit?.summary.skippedInvalidStudentIdCount ?? 0}
            </span>
            <span className="rounded bg-white/80 px-2 py-1 text-slate-700">
              {t("negamonRewardAuditNoMatch")}: {rewardAudit?.summary.skippedNoMatchCount ?? 0}
            </span>
            <span className="rounded bg-white/80 px-2 py-1 text-slate-700">
              {t("negamonRewardAuditDuplicate")}: {
                (rewardAudit?.events ?? []).reduce((count, event) => (
                  count +
                  metadataArray<NegamonRewardAuditSkippedPlayer>(event.metadata, "skippedPlayers").filter(
                    (player) => player.reason === "duplicate_student"
                  ).length
                ), 0)
              }
            </span>
            <span className="rounded bg-white/80 px-2 py-1 text-slate-700">
              {t("negamonRewardAuditZeroExp")}: {
                (rewardAudit?.events ?? []).reduce((count, event) => (
                  count +
                  metadataArray<NegamonRewardAuditSkippedPlayer>(event.metadata, "skippedPlayers").filter(
                    (player) => player.reason === "non_positive_exp"
                  ).length
                ), 0)
              }
            </span>
          </div>
        ) : null}
        <div className="mt-4 rounded-lg border border-sky-100 bg-white/80 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-900">
                {t("negamonRewardRemediationTitle")}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {t("negamonRewardRemediationSubtitle")}
              </p>
            </div>
            {rewardRemediationLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
          </div>
          <div className="grid gap-2 text-xs font-bold sm:grid-cols-5">
            <span className="rounded bg-sky-50 px-2 py-1 text-sky-800">
              {t("negamonRewardRemediationEvents")}: {rewardRemediation?.summary.eventCount ?? 0}
            </span>
            <span className="rounded bg-sky-50 px-2 py-1 text-sky-800">
              {t("negamonRewardRemediationStudents")}: {rewardRemediation?.summary.studentCount ?? 0}
            </span>
            <span className="rounded bg-sky-50 px-2 py-1 text-sky-800">
              {t("negamonRewardRemediationNames")}: {rewardRemediation?.summary.nameChangeCount ?? 0}
            </span>
            <span className="rounded bg-sky-50 px-2 py-1 text-sky-800">
              {t("negamonRewardRemediationNicknames")}: {rewardRemediation?.summary.nicknameChangeCount ?? 0}
            </span>
            <span className="rounded bg-sky-50 px-2 py-1 text-sky-800">
              {t("negamonRewardRemediationPins")}: {rewardRemediation?.summary.gamePinCount ?? 0}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {(rewardRemediation?.events ?? []).slice(0, 4).map((event, index) => {
              const remediationGamePin = metadataString(event.metadata, "rewardGamePin");
              const studentLookup = metadataString(event.metadata, "studentLookup");
              const changes = event.metadata.changes && typeof event.metadata.changes === "object"
                ? Object.keys(event.metadata.changes as Record<string, unknown>)
                : [];
              return (
                <div key={`${event.timestamp}-${index}`} className="rounded-md bg-slate-50 px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-slate-800">
                      {t("negamonRewardRemediationEventLabel")}
                      {remediationGamePin ? ` #${remediationGamePin}` : ""}
                    </p>
                    <span className="rounded bg-white px-2 py-1 font-bold text-slate-600">{event.status}</span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                    {studentLookup ? ` | ${studentLookup}` : ""}
                  </p>
                  {changes.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {changes.map((changeKey) => (
                        <span key={changeKey} className="rounded-full bg-white px-2 py-1 font-bold text-sky-700">
                          {changeKey}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!rewardRemediationLoading && (rewardRemediation?.events.length ?? 0) === 0 ? (
              <p className="text-xs font-semibold text-slate-400">{t("negamonRewardRemediationEmpty")}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-indigo-100 bg-white/80 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-indigo-900">
                {t("negamonRewardEffectivenessTitle")}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {t("negamonRewardEffectivenessSubtitle")}
              </p>
            </div>
            {rewardEffectivenessLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
          </div>
          <div className="grid gap-2 text-xs font-bold sm:grid-cols-4">
            <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-800">
              {t("negamonRewardEffectivenessPins")}: {rewardEffectiveness?.summary.gamePinCount ?? 0}
            </span>
            <span className="rounded bg-amber-50 px-2 py-1 text-amber-800">
              {t("negamonRewardEffectivenessSkips")}: {rewardEffectiveness?.summary.pinsWithSkips ?? 0}
            </span>
            <span className="rounded bg-sky-50 px-2 py-1 text-sky-800">
              {t("negamonRewardEffectivenessTouched")}: {rewardEffectiveness?.summary.pinsWithRemediation ?? 0}
            </span>
            <span className="rounded bg-rose-50 px-2 py-1 text-rose-800">
              {t("negamonRewardEffectivenessFollowUp")}: {rewardEffectiveness?.summary.pinsNeedingFollowUp ?? 0}
            </span>
          </div>
          <div className="mt-2 grid gap-2 text-xs font-bold sm:grid-cols-3">
            <span className="rounded bg-slate-50 px-2 py-1 text-slate-700">
              {t("negamonRewardAuditRecipients")}: {rewardEffectiveness?.summary.totalRecipients ?? 0}
            </span>
            <span className="rounded bg-slate-50 px-2 py-1 text-slate-700">
              {t("negamonRewardAuditSkippedPlayers")}: {rewardEffectiveness?.summary.totalSkippedPlayers ?? 0}
            </span>
            <span className="rounded bg-slate-50 px-2 py-1 text-slate-700">
              {t("negamonRewardRemediationEvents")}: {rewardEffectiveness?.summary.totalRemediationEvents ?? 0}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {(rewardEffectiveness?.gamePins ?? []).map((item) => (
              <div
                key={item.gamePin}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-800">
                    {t("negamonRewardEffectivenessGamePinLabel")} #{item.gamePin}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRewardResync(item.gamePin)}
                      disabled={rewardEffectivenessLoading || resyncingGamePin === item.gamePin}
                    >
                      {resyncingGamePin === item.gamePin ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t("negamonRewardResyncAction")}
                    </Button>
                    <span className="rounded bg-white px-2 py-1 font-bold text-emerald-700">
                      {t("negamonRewardAuditApplied")}: {item.appliedEventCount}
                    </span>
                    <span className="rounded bg-white px-2 py-1 font-bold text-amber-700">
                      {t("negamonRewardAuditSkipped")}: {item.skippedEventCount}
                    </span>
                    <span className="rounded bg-white px-2 py-1 font-bold text-sky-700">
                      {t("negamonRewardRemediationEvents")}: {item.remediationEventCount}
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 text-[11px] font-semibold text-slate-600 sm:grid-cols-4">
                  <span>{t("negamonRewardAuditRecipients")}: {item.recipientCount}</span>
                  <span>{t("negamonRewardAuditSkippedPlayers")}: {item.skippedPlayerCount}</span>
                  <span>{t("negamonRewardEffectivenessStudents")}: {item.remediatedStudentCount}</span>
                  <span>{t("negamonRewardEffectivenessRewardEvents")}: {item.rewardEventCount}</span>
                </div>
                {item.skippedPlayerCount > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => void focusRewardGamePin(item.gamePin)}
                      className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100"
                    >
                      {t("negamonRewardResolvedBadge", {
                        resolved: item.resolvedSkippedCount,
                        total: item.skippedPlayerCount,
                      })}
                    </button>
                    <button
                      type="button"
                      onClick={() => void focusRewardGamePin(item.gamePin)}
                      className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 hover:bg-amber-100"
                    >
                      {t("negamonRewardUnresolvedBadge", {
                        count: item.unresolvedSkippedCount,
                      })}
                    </button>
                  </div>
                ) : null}
                <p className="mt-2 text-[11px] font-semibold text-slate-500">
                  {t("negamonRewardEffectivenessLastReward")}: {new Date(item.latestRewardAt).toLocaleString()}
                  {item.latestRemediationAt
                    ? ` | ${t("negamonRewardEffectivenessLastFix")}: ${new Date(item.latestRemediationAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
            ))}
            {!rewardEffectivenessLoading && (rewardEffectiveness?.gamePins.length ?? 0) === 0 ? (
              <p className="text-xs font-semibold text-slate-400">{t("negamonRewardEffectivenessEmpty")}</p>
            ) : null}
          </div>
        </div>
        {rewardResyncResult ? (
          <div className="mt-4 rounded-lg border border-emerald-100 bg-white/80 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-900">
                  {t("negamonRewardResyncResultTitle")} #{rewardResyncResult.gamePin}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {t("negamonRewardResyncReason")}: {rewardResyncResult.reason}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRewardResyncResult(null)}
              >
                Close
              </Button>
            </div>
            <div className="grid gap-2 text-xs font-bold sm:grid-cols-3">
              <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">
                {t("negamonRewardResyncApplied")}: {rewardResyncResult.appliedCount}
              </span>
              <span className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                {t("negamonRewardResyncSkipped")}: {rewardResyncResult.skippedCount}
              </span>
              <span className="rounded bg-rose-50 px-2 py-1 text-rose-800">
                {t("negamonRewardResyncUnresolved")}: {rewardResyncResult.unresolvedCount}
              </span>
            </div>
            {rewardResyncResult.appliedRecipients.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-emerald-900">
                  {t("negamonRewardResyncAppliedRecipients")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rewardResyncResult.appliedRecipients.map((recipient, index) => (
                    <div
                      key={`${recipient.studentId}-${index}`}
                      className="rounded-md bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-900"
                    >
                      <p className="font-black">
                        #{recipient.rank} +{recipient.exp} EXP
                      </p>
                      <p>{studentNameById(students, recipient.studentId)}</p>
                      <p>Score: {recipient.finalScore}</p>
                      <p>{t("negamonRewardResyncSource")}: {recipient.identitySource}</p>
                      <p>
                        {t("negamonRewardResyncBehavior")}: {recipient.behaviorPointsBefore} {"->"} {recipient.behaviorPointsAfter}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={buildStudentActionHref({
                            classId,
                            playerName: studentNameById(students, recipient.studentId),
                            studentId: recipient.studentId,
                            rewardGamePin: rewardResyncResult.gamePin,
                            action: "history",
                          })}
                          className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-700 hover:bg-slate-100"
                        >
                          {t("classroomStudentLookupHistory")}
                        </a>
                        <a
                          href={buildStudentActionHref({
                            classId,
                            playerName: studentNameById(students, recipient.studentId),
                            studentId: recipient.studentId,
                            rewardGamePin: rewardResyncResult.gamePin,
                            action: "manage",
                          })}
                          className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-sky-700 hover:bg-sky-50"
                        >
                          {t("classroomStudentLookupManage")}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {rewardResyncResult.skippedPlayers.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-amber-900">
                  {t("negamonRewardResyncRemainingSkipped")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rewardResyncResult.skippedPlayers.map((player, index) => (
                    <div
                      key={`${player.name ?? "skipped"}-${index}`}
                      className="rounded-md bg-amber-50 px-3 py-2 text-[11px] font-semibold text-slate-800"
                    >
                      <p className="font-black">
                        {player.rank ? `#${player.rank} ` : ""}
                        <a
                          href={buildStudentActionHref({
                            classId,
                            playerName: player.name ?? "",
                            studentId: player.studentId,
                            rewardGamePin: rewardResyncResult.gamePin,
                            action: "manage",
                          })}
                          className="underline decoration-sky-300 underline-offset-2 hover:text-sky-700"
                        >
                          {player.name ?? t("studentName")}
                        </a>
                      </p>
                      <p className="text-amber-700">{skippedReasonLabel(player.reason, t)}</p>
                      {typeof player.exp === "number" ? <p>EXP {player.exp}</p> : null}
                      {typeof player.finalScore === "number" ? <p>Score {player.finalScore}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 space-y-2">
          {(rewardAudit?.events ?? []).slice(0, 6).map((event, index) => {
            const gamePin = metadataString(event.metadata, "gamePin");
            const metadataReason = metadataString(event.metadata, "reason");
            const isSkipped = event.action === "classroom.negamon_battle.rewards_skipped";
            const skippedPlayers = metadataArray<NegamonRewardAuditSkippedPlayer>(event.metadata, "skippedPlayers");
            const recipients = metadataArray<NegamonRewardAuditRecipient>(event.metadata, "recipients");
            return (
              <div key={`${event.timestamp}-${index}`} className="rounded-lg bg-white/80 px-3 py-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                  <p className={isSkipped ? "font-black text-amber-700" : "font-black text-emerald-700"}>
                    {isSkipped ? t("negamonRewardAuditSkipped") : t("negamonRewardAuditApplied")}
                    {gamePin ? ` #${gamePin}` : ""}
                  </p>
                  <p className="font-semibold text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                    {metadataReason ? ` · ${metadataReason}` : ""}
                  </p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 font-black text-slate-600">{event.status}</span>
                </div>
                {recipients.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recipients.slice(0, 6).map((recipient, recipientIndex) => (
                      <span
                        key={`${recipient.studentId ?? "recipient"}-${recipientIndex}`}
                        className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700"
                      >
                        {recipient.rank ? `#${recipient.rank} ` : ""}
                        +{recipient.exp ?? 0} EXP
                        {recipient.identitySource ? ` | ${recipient.identitySource}` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
                {skippedPlayers.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-amber-100 bg-amber-50/70 p-2">
                    <p className="text-[11px] font-black uppercase tracking-wide text-amber-900">
                      {t("negamonRewardAuditSkippedPlayers")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {skippedPlayers.slice(0, 6).map((player, playerIndex) => (
                        <div
                          key={`${player.name ?? "player"}-${playerIndex}`}
                          className="rounded-md bg-white/80 px-2 py-2 text-[11px] font-semibold text-slate-700"
                        >
                          <p className="font-black text-slate-800">
                            {player.rank ? `#${player.rank} ` : ""}
                            <a
                              href={buildStudentActionHref({
                                classId,
                                playerName: player.name ?? "",
                                studentId: player.studentId,
                                rewardGamePin: gamePin,
                                action: "manage",
                              })}
                              className="underline decoration-sky-300 underline-offset-2 hover:text-sky-700"
                            >
                              {player.name ?? t("studentName")}
                            </a>
                          </p>
                          <p className="text-amber-700">{skippedReasonLabel(player.reason, t)}</p>
                          {typeof player.exp === "number" ? <p>EXP {player.exp}</p> : null}
                          {typeof player.finalScore === "number" ? <p>Score {player.finalScore}</p> : null}
                          <div className="mt-2 flex flex-wrap gap-2">
                            <a
                              href={buildStudentActionHref({
                                classId,
                                playerName: player.name ?? "",
                                studentId: player.studentId,
                                rewardGamePin: gamePin,
                                action: "manage",
                              })}
                              className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-black text-sky-700 hover:bg-sky-200"
                            >
                              {t("classroomStudentLookupManage")}
                            </a>
                            <a
                              href={buildStudentActionHref({
                                classId,
                                playerName: player.name ?? "",
                                studentId: player.studentId,
                                rewardGamePin: gamePin,
                                action: "history",
                              })}
                              className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-700 hover:bg-slate-200"
                            >
                              {t("classroomStudentLookupHistory")}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!rewardAuditLoading && (rewardAudit?.events.length ?? 0) === 0 ? (
            <p className="text-xs font-semibold text-slate-400">{t("negamonRewardAuditEmpty")}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-amber-700" />
            <p className="text-sm font-black text-amber-900">{t("economyLedgerAdjustTitle")}</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-white/70 p-1">
            {(["single", "selected", "all"] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setAdjustScope(scope)}
                className={`rounded-md px-3 py-1.5 text-xs font-black ${
                  adjustScope === scope
                    ? "bg-amber-600 text-white"
                    : "text-amber-800 hover:bg-amber-100"
                }`}
              >
                {scope === "single"
                  ? t("economyLedgerAdjustScopeSingle")
                  : scope === "selected"
                    ? t("economyLedgerAdjustScopeSelected")
                    : t("economyLedgerAdjustScopeAll")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1.2fr)_auto]">
          {adjustScope === "single" ? (
            <select
              value={adjustStudentId}
              onChange={(e) => setAdjustStudentId(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">{t("economyLedgerPickStudent")}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {studentLabel(student)}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
              <Users className="mr-2 inline h-4 w-4 text-amber-600" />
              {adjustScope === "all"
                ? t("economyLedgerAdjustAllCount", { count: students.length })
                : t("economyLedgerAdjustSelectedCount", { count: adjustStudentIds.length })}
            </div>
          )}
          <Input
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder={t("economyLedgerAdjustAmount")}
          />
          <Input
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder={t("economyLedgerAdjustReason")}
          />
          <Button onClick={() => void handleAdjustment()} disabled={!canApplyAdjustment}>
            {adjusting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("economyLedgerAdjustApply")}
          </Button>
        </div>
        <div className="mt-3 rounded-lg border border-amber-100 bg-white/70 px-3 py-2 text-xs font-bold text-amber-900">
          {canApplyAdjustment
            ? t("economyLedgerAdjustPreview", {
                count: adjustmentTargetCount,
                amount: adjustmentAmountNumber,
                total: adjustmentTotal,
              })
            : t("economyLedgerAdjustPreviewEmpty")}
        </div>
        {adjustScope === "selected" ? (
          <div className="mt-3 rounded-lg border border-amber-100 bg-white/75 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black text-amber-900">{t("economyLedgerAdjustSelectedStudents")}</p>
              <button
                type="button"
                onClick={() => {
                  setAdjustStudentIds(
                    adjustStudentIds.length === students.length ? [] : students.map((student) => student.id)
                  );
                }}
                className="text-xs font-black text-amber-700 hover:text-amber-900"
              >
                {adjustStudentIds.length === students.length
                  ? t("economyLedgerAdjustClearSelection")
                  : t("economyLedgerAdjustSelectAll")}
              </button>
            </div>
            <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <label key={student.id} className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={adjustStudentIds.includes(student.id)}
                    onChange={() => toggleAdjustStudent(student.id)}
                    className="h-4 w-4 rounded border-amber-300"
                  />
                  <span className="truncate">{studentLabel(student)}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <p className="mb-1 text-xs font-bold text-slate-500">{t("economyLedgerFilterStudentId")}</p>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">{t("economyLedgerAll")}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {studentLabel(student)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-slate-500">{t("economyLedgerFilterSource")}</p>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as (typeof SOURCE_OPTIONS)[number])}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm"
          >
            <option value="">{t("economyLedgerAll")}</option>
            {SOURCE_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-slate-500">{t("economyLedgerFilterType")}</p>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPE_OPTIONS)[number])}
            className="h-10 rounded-md border border-slate-200 px-3 text-sm"
          >
            <option value="">{t("economyLedgerAll")}</option>
            {TYPE_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <p className="mb-1 text-xs font-bold text-slate-500">{t("economyLedgerFilterLimit")}</p>
          <Input value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
        <Button onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("economyLedgerApply")}
        </Button>
        <a href={exportHref}>
          <Button variant="outline" type="button">
            <Download className="mr-2 h-4 w-4" />
            {t("economyLedgerExportCsv")}
          </Button>
        </a>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      {data ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold">
            {t("economyLedgerRows")}: {data.summary.rowCount}
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            {t("economyLedgerEarned")}: +{data.summary.totalEarned}
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            {t("economyLedgerSpent")}: -{data.summary.totalSpent}
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm font-bold text-indigo-700">
            {t("economyLedgerNet")}: {data.summary.net}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">{t("studentName")}</th>
              <th className="px-3 py-2">{t("economyLedgerTableType")}</th>
              <th className="px-3 py-2">{t("economyLedgerTableSource")}</th>
              <th className="px-3 py-2">{t("economyLedgerTableAmount")}</th>
              <th className="px-3 py-2">{t("economyLedgerTableBalance")}</th>
              <th className="px-3 py-2">{t("economyLedgerTableDate")}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.transactions ?? []).map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-700">
                  {row.student?.name ?? row.studentId}
                </td>
                <td className="px-3 py-2">{row.type}</td>
                <td className="px-3 py-2">{row.source}</td>
                <td className={`px-3 py-2 font-bold ${row.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {row.amount >= 0 ? `+${row.amount}` : row.amount}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {row.balanceBefore} {"->"} {row.balanceAfter}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {!loading && (data?.transactions.length ?? 0) === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-400" colSpan={6}>
                  {t("economyLedgerEmpty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
