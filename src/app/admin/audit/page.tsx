import { auth } from "@/auth";
import { AdminAuditClient } from "@/components/admin/admin-audit-client";
import { listRecentAuditEvents } from "@/lib/security/audit-log";
import { redirect } from "next/navigation";

type AdminAuditPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const dayOptionValues = ["1", "7", "30", "90"] as const;

const actionGroupValues = ["", "admin.", "classroom.", "socket.", "upload."] as const;

const statusValues = ["", "success", "rejected", "error"] as const;

const categoryValues = ["", "admin", "classroom", "socket", "upload", "auth", "other"] as const;

function readQueryParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return value?.trim() ?? "";
}

function resolveDays(rawDays: string): (typeof dayOptionValues)[number] {
  if (!dayOptionValues.includes(rawDays as (typeof dayOptionValues)[number])) {
    return "7";
  }
  return rawDays as (typeof dayOptionValues)[number];
}

function resolveActionGroup(rawGroup: string): (typeof actionGroupValues)[number] {
  if (!actionGroupValues.includes(rawGroup as (typeof actionGroupValues)[number])) {
    return "";
  }
  return rawGroup as (typeof actionGroupValues)[number];
}

function resolveStatus(rawStatus: string): (typeof statusValues)[number] {
  if (!statusValues.includes(rawStatus as (typeof statusValues)[number])) {
    return "";
  }
  return rawStatus as (typeof statusValues)[number];
}

function resolveCategory(rawCategory: string): (typeof categoryValues)[number] {
  if (!categoryValues.includes(rawCategory as (typeof categoryValues)[number])) {
    return "";
  }
  return rawCategory as (typeof categoryValues)[number];
}

function buildSinceDate(days: string) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  return since;
}

function buildAuditQueryString(params: {
  action: string;
  actor: string;
  target: string;
  reason: string;
  group: string;
  category: string;
  days: string;
  status: string;
}) {
  const search = new URLSearchParams();
  if (params.action) search.set("action", params.action);
  if (params.actor) search.set("actor", params.actor);
  if (params.target) search.set("target", params.target);
  if (params.reason) search.set("reason", params.reason);
  if (params.group) search.set("group", params.group);
  if (params.category) search.set("category", params.category);
  if (params.days) search.set("days", params.days);
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps = {}) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user || role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const action = readQueryParam(params.action);
  const actor = readQueryParam(params.actor);
  const target = readQueryParam(params.target);
  const reason = readQueryParam(params.reason);
  const group = resolveActionGroup(readQueryParam(params.group));
  const category = resolveCategory(readQueryParam(params.category));
  const days = resolveDays(readQueryParam(params.days));
  const status = resolveStatus(readQueryParam(params.status));

  const events = await listRecentAuditEvents(100, {
    action,
    actorUserId: actor,
    targetId: target,
    reason,
    actionPrefix: group,
    category: category || undefined,
    status: status || undefined,
    since: buildSinceDate(days),
  });

  const exportHref = `/admin/audit/export${buildAuditQueryString({
    action,
    actor,
    target,
    reason,
    group,
    category,
    days,
    status,
  })}`;

  const hasFilters = Boolean(action || actor || target || reason || group || category || status);
  const rejectedCount = events.filter((event) => event.status === "rejected").length;
  const errorCount = events.filter((event) => event.status === "error").length;
  const authCount = events.filter((event) => event.category === "auth").length;
  const uploadCount = events.filter((event) => event.category === "upload").length;

  return (
    <AdminAuditClient
      events={events.map((event) => ({
        ...event,
        timestamp: event.timestamp.toISOString(),
      }))}
      exportHref={exportHref}
      rejectedCount={rejectedCount}
      errorCount={errorCount}
      authCount={authCount}
      uploadCount={uploadCount}
      hasFilters={hasFilters}
      query={{
        action,
        actor,
        target,
        reason,
        group,
        category,
        days,
        status,
      }}
    />
  );
}
