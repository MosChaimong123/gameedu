"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Gamepad2, ScrollText, ShieldCheck, Users } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

export type AdminDashboardRecentUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  image: string | null;
};

type AdminDashboardClientProps = {
  userName: string;
  displayInitial: string;
  counts: {
    users: number;
    teachers: number;
    students: number;
    sets: number;
    games: number;
  };
  recentUsers: AdminDashboardRecentUser[];
};

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  TEACHER: "bg-purple-100 text-purple-700",
  STUDENT: "bg-blue-100 text-blue-700",
};

export function AdminDashboardClient({ userName, displayInitial, counts, recentUsers }: AdminDashboardClientProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "th" ? "th-TH" : "en-US";

  const stats = [
    { labelKey: "adminStatTotalUsers", value: counts.users, icon: Users, bg: "bg-blue-50", text: "text-blue-600" },
    { labelKey: "adminStatTeachers", value: counts.teachers, icon: ShieldCheck, bg: "bg-purple-50", text: "text-purple-600" },
    { labelKey: "adminStatStudents", value: counts.students, icon: Users, bg: "bg-green-50", text: "text-green-600" },
    { labelKey: "adminStatQuestionSets", value: counts.sets, icon: BookOpen, bg: "bg-orange-50", text: "text-orange-600" },
    { labelKey: "adminStatGamesPlayed", value: counts.games, icon: Gamepad2, bg: "bg-rose-50", text: "text-rose-600" },
  ] as const;

  const links = [
    {
      labelKey: "adminUsersTitle",
      descKey: "adminUsersDesc",
      icon: Users,
      href: "/admin/users",
      color: "text-purple-600",
      bg: "bg-purple-50 hover:bg-purple-100 border-purple-100",
    },
    {
      labelKey: "adminSetsTitle",
      descKey: "adminSetsDesc",
      icon: BookOpen,
      href: "/admin/sets",
      color: "text-orange-600",
      bg: "bg-orange-50 hover:bg-orange-100 border-orange-100",
    },
    {
      labelKey: "adminLinkAuditTitle",
      descKey: "adminLinkAuditDesc",
      icon: ScrollText,
      href: "/admin/audit",
      color: "text-sky-600",
      bg: "bg-sky-50 hover:bg-sky-100 border-sky-100",
    },
    {
      labelKey: "adminLinkTeacherDashboard",
      descKey: "adminLinkTeacherDashboardDesc",
      icon: ShieldCheck,
      href: "/dashboard",
      color: "text-slate-600",
      bg: "bg-slate-50 hover:bg-slate-100 border-slate-200",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black text-white">{t("adminDashboardBrand")}</span>
            <span className="ml-3 rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
              {t("adminDashboardRoleBadge")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm font-semibold text-slate-400 transition-colors hover:text-white">
            {t("adminTeacherDashboardLink")}
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
            {displayInitial}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800">{t("adminDashboardWelcome", { name: userName || t("adminDashboardNameFallback") })}</h1>
          <p className="mt-1 text-slate-500">{t("adminDashboardSubtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.labelKey} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.text}`} />
              </div>
              <p className="text-3xl font-black text-slate-800">{stat.value.toLocaleString(dateLocale)}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-500">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <h2 className="font-bold text-slate-800">{t("adminDashboardRecentUsers")}</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
              {t("adminDashboardUserCountBadge", { count: String(counts.users) })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("adminDashboardColName")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("adminUserColEmail")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("adminUserColRole")}</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t("adminDashboardColJoined")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 text-sm font-bold text-white">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name || ""}
                              width={32}
                              height={32}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            user.name?.charAt(0) || "?"
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{user.name || t("adminNoName")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">{user.email}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${roleColors[user.role] || "bg-slate-100 text-slate-600"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString(dateLocale, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${link.bg} group flex items-center gap-4 rounded-2xl border p-5 transition-colors`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <link.icon className={`h-6 w-6 ${link.color}`} />
              </div>
              <div>
                <p className="font-bold text-slate-800">{t(link.labelKey)}</p>
                <p className="text-xs text-slate-500">{t(link.descKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
