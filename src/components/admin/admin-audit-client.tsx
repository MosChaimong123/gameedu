"use client";

import { PageBackLink } from "@/components/ui/page-back-link";
import { useLanguage } from "@/components/providers/language-provider";
import { ScrollText } from "lucide-react";
import type { AuditLogListItem } from "@/lib/security/audit-log";

export type AdminAuditSerializableEvent = Omit<AuditLogListItem, "timestamp"> & { timestamp: string };

type AdminAuditClientProps = {
  events: AdminAuditSerializableEvent[];
  exportHref: string;
  rejectedCount: number;
  errorCount: number;
  authCount: number;
  uploadCount: number;
  hasFilters: boolean;
  query: {
    action: string;
    actor: string;
    target: string;
    reason: string;
    group: string;
    days: string;
    category: string;
    status: string;
  };
};

function getStatusBadgeClassName(status: "success" | "rejected" | "error") {
  switch (status) {
    case "rejected":
      return "bg-amber-100 text-amber-700";
    case "error":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function getCategoryBadgeClassName(category: "admin" | "classroom" | "socket" | "upload" | "auth" | "other") {
  switch (category) {
    case "admin":
      return "bg-violet-100 text-violet-700";
    case "classroom":
      return "bg-sky-100 text-sky-700";
    case "socket":
      return "bg-cyan-100 text-cyan-700";
    case "upload":
      return "bg-fuchsia-100 text-fuchsia-700";
    case "auth":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "-";
  }
  return JSON.stringify(metadata);
}

export function AdminAuditClient({
  events,
  exportHref,
  rejectedCount,
  errorCount,
  authCount,
  uploadCount,
  hasFilters,
  query,
}: AdminAuditClientProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "th" ? "th-TH" : "en-US";

  const formatMetadataPretty = (metadata: Record<string, unknown> | undefined) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return t("adminAuditNoMetadata");
    }
    return JSON.stringify(metadata, null, 2);
  };

  const actionGroupOptions = [
    { value: "", label: t("adminAuditFilterAllActions") },
    { value: "admin.", label: t("adminAuditGroupAdmin") },
    { value: "classroom.", label: t("adminAuditGroupClassroom") },
    { value: "socket.", label: t("adminAuditGroupSocket") },
    { value: "upload.", label: t("adminAuditGroupUpload") },
  ] as const;

  const dayOptions = [
    { value: "1", label: t("adminAuditDays24h") },
    { value: "7", label: t("adminAuditDays7") },
    { value: "30", label: t("adminAuditDays30") },
    { value: "90", label: t("adminAuditDays90") },
  ] as const;

  const statusOptions = [
    { value: "", label: t("adminAuditFilterAllStatus") },
    { value: "success", label: t("adminAuditStatusSuccess") },
    { value: "rejected", label: t("adminAuditStatusRejected") },
    { value: "error", label: t("adminAuditStatusError") },
  ] as const;

  const categoryOptions = [
    { value: "", label: t("adminAuditFilterAllCategories") },
    { value: "admin", label: t("adminAuditCatAdmin") },
    { value: "classroom", label: t("adminAuditCatClassroom") },
    { value: "socket", label: t("adminAuditCatSocket") },
    { value: "upload", label: t("adminAuditCatUpload") },
    { value: "auth", label: t("adminAuditCatAuth") },
    { value: "other", label: t("adminAuditCatOther") },
  ] as const;

  const quickFilterLinks = [
    { label: t("adminAuditQuickFailures"), href: "/admin/audit?status=error" },
    { label: t("adminAuditQuickRejected"), href: "/admin/audit?status=rejected" },
    { label: t("adminAuditQuickUploads"), href: "/admin/audit?category=upload" },
    { label: t("adminAuditQuickAuth"), href: "/admin/audit?category=auth" },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <PageBackLink href="/admin" labelKey="navBackAdmin" />
          <div>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-sky-600" />
              <h1 className="text-2xl font-black text-slate-800">{t("adminAuditPageTitle")}</h1>
            </div>
            <p className="text-sm text-slate-500">{t("adminAuditPageDesc")}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="font-bold text-slate-800">{t("adminAuditRecentTitle")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("adminAuditRecentLimitNote")}</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={exportHref}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {t("adminAuditExportCsv")}
              </a>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                {t("adminAuditEventsCount", { count: String(events.length) })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-white px-6 py-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-500">{t("adminAuditStatEventsInView")}</div>
              <div className="mt-2 text-2xl font-black text-slate-800">{events.length}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-bold uppercase text-amber-700">{t("adminAuditStatRejected")}</div>
              <div className="mt-2 text-2xl font-black text-amber-800">{rejectedCount}</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs font-bold uppercase text-rose-700">{t("adminAuditStatErrors")}</div>
              <div className="mt-2 text-2xl font-black text-rose-800">{errorCount}</div>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="text-xs font-bold uppercase text-indigo-700">{t("adminAuditStatAuthUpload")}</div>
              <div className="mt-2 text-2xl font-black text-indigo-800">{authCount + uploadCount}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
            {quickFilterLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
          </div>

          <form className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4 md:grid-cols-2 xl:grid-cols-7" action="/admin/audit" method="get">
            <select
              name="group"
              defaultValue={query.group}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {actionGroupOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="days"
              defaultValue={query.days}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {dayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={query.category}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {categoryOptions.map((option) => (
                <option key={option.value || "all-category"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={query.status}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all-status"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="action"
              defaultValue={query.action}
              placeholder={t("adminAuditPlaceholderAction")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <input
              type="text"
              name="actor"
              defaultValue={query.actor}
              placeholder={t("adminAuditPlaceholderActor")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <input
              type="text"
              name="target"
              defaultValue={query.target}
              placeholder={t("adminAuditPlaceholderTarget")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <input
              type="text"
              name="reason"
              defaultValue={query.reason}
              placeholder={t("adminAuditPlaceholderReason")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <div className="flex items-center gap-2 md:col-span-2 xl:col-span-7">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                {t("adminAuditSearch")}
              </button>
              <a
                href="/admin/audit"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {t("adminAuditClear")}
              </a>
            </div>
          </form>

          {events.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <ScrollText className="mx-auto mb-3 h-12 w-12 text-slate-200" />
              {hasFilters ? (
                <>
                  <p className="font-medium text-slate-500">{t("adminAuditEmptyFilteredTitle")}</p>
                  <p className="mt-1 text-sm text-slate-400">{t("adminAuditEmptyFilteredHint")}</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-500">{t("adminAuditEmptyTitle")}</p>
                  <p className="mt-1 text-sm text-slate-400">{t("adminAuditEmptyHint")}</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColTime")}</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColAction")}</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColCategory")}</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColStatus")}</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColReason")}</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColActor")}</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColTarget")}</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColMetadata")}</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminAuditColDetails")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event, index) => (
                    <tr
                      key={`${event.action}-${event.targetId ?? "none"}-${event.timestamp}-${index}`}
                      className="align-top hover:bg-slate-50/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                        {new Date(event.timestamp).toLocaleString(dateLocale)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700">{event.action}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClassName(event.category)}`}>
                          {event.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadgeClassName(event.status)}`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{event.reason ?? "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{event.actorUserId ?? "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">{event.targetType}</span>
                          <span className="text-xs text-slate-400">{event.targetId ?? "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="block max-w-xl overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {formatMetadata(event.metadata)}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <details className="group max-w-md rounded-lg border border-slate-200 bg-white p-3">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">{t("adminAuditViewDetails")}</summary>
                          <div className="mt-3 space-y-3 text-xs text-slate-600">
                            <div>
                              <div className="font-semibold text-slate-700">{t("adminAuditDetailTimestamp")}</div>
                              <div>{new Date(event.timestamp).toLocaleString(dateLocale)}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">{t("adminAuditColCategory")}</div>
                              <div>{event.category}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">{t("adminAuditColStatus")}</div>
                              <div>{event.status}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">{t("adminAuditColReason")}</div>
                              <div>{event.reason ?? "-"}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">{t("adminAuditColActor")}</div>
                              <div>{event.actorUserId ?? "-"}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">{t("adminAuditColTarget")}</div>
                              <div>{event.targetType}</div>
                              <div className="text-slate-500">{event.targetId ?? "-"}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">{t("adminAuditColMetadata")}</div>
                              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
                                {formatMetadataPretty(event.metadata)}
                              </pre>
                            </div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
