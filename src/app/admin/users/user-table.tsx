"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  MailX,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserCheck,
  Users,
} from "lucide-react";
import {
  ADMIN_USERS_PAGE_SIZE_OPTIONS,
  buildAdminUsersListHref,
  type AdminUsersPageSize,
  type AdminUsersRoleFilter,
  type AdminUsersVerificationFilter,
} from "@/lib/admin-users-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { deleteUser, updateUserSubscription, resetUserPassword } from "../admin-actions";
import { useLanguage } from "@/components/providers/language-provider";
import type { AppRole } from "@/lib/roles";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: AppRole;
  createdAt: Date;
  plan: string | null;
  planStatus: string | null;
  planExpiry: Date | null;
  emailVerified: Date | null;
  hasPassword: boolean;
  _count: {
    classrooms: number;
    studentProfiles: number;
  };
}

type UserTableProps = {
  users: User[];
  total: number;
  page: number;
  pageSize: AdminUsersPageSize;
  query: string;
  roleFilter: AdminUsersRoleFilter;
  verificationFilter: AdminUsersVerificationFilter;
  counts: {
    admins: number;
    teachers: number;
    students: number;
    users: number;
    verified: number;
    unverified: number;
  };
};

const LIST_PATH = "/admin/users";

function isTeacherRole(role: AppRole) {
  return role === "TEACHER";
}

export function UserTable({
  users: initialUsers,
  total,
  page,
  pageSize,
  query,
  roleFilter,
  verificationFilter,
  counts,
}: UserTableProps) {
  const router = useRouter();
  const [users, setUsers] = React.useState(initialUsers);
  const [searchTerm, setSearchTerm] = React.useState(query);
  const [isPending, setIsPending] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null);
  const [subscriptionTarget, setSubscriptionTarget] = React.useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = React.useState<User | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [subPlan, setSubPlan] = React.useState<"FREE" | "PLUS" | "PRO">("FREE");
  const [subStatus, setSubStatus] = React.useState<"ACTIVE" | "EXPIRED" | "INACTIVE">("INACTIVE");
  const [subExpiry, setSubExpiry] = React.useState<string>("");
  const { toast } = useToast();
  const { t, language } = useLanguage();

  React.useEffect(() => {
    if (!subscriptionTarget) return;
    const p = subscriptionTarget.plan === "PLUS" || subscriptionTarget.plan === "PRO" ? subscriptionTarget.plan : "FREE";
    setSubPlan(p);
    const s = subscriptionTarget.planStatus;
    setSubStatus(s === "ACTIVE" || s === "EXPIRED" || s === "INACTIVE" ? s : "INACTIVE");
    if (subscriptionTarget.planExpiry) {
      const d = new Date(subscriptionTarget.planExpiry);
      setSubExpiry(Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10));
    } else {
      setSubExpiry("");
    }
  }, [subscriptionTarget]);

  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  React.useEffect(() => {
    setSearchTerm(query);
  }, [query]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmed = searchTerm.trim();
      if (trimmed === query.trim()) {
        return;
      }
      router.push(
        buildAdminUsersListHref(LIST_PATH, {
          q: trimmed,
          page: 1,
          pageSize,
          role: roleFilter,
          verification: verificationFilter,
        })
      );
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchTerm, query, pageSize, roleFilter, verificationFilter, router]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);
  const prevHref =
    page > 1
      ? buildAdminUsersListHref(LIST_PATH, { q: query, page: page - 1, pageSize, role: roleFilter, verification: verificationFilter })
      : null;
  const nextHref =
    page < totalPages
      ? buildAdminUsersListHref(LIST_PATH, { q: query, page: page + 1, pageSize, role: roleFilter, verification: verificationFilter })
      : null;

  const handleSaveSubscription = async () => {
    if (!subscriptionTarget) return;
    setIsPending(subscriptionTarget.id);
    const result = await updateUserSubscription(subscriptionTarget.id, {
      plan: subPlan,
      planStatus: subStatus,
      planExpiry: subExpiry.trim() === "" ? null : subExpiry.trim(),
    });
    setIsPending(null);
    if (result.success) {
      const expiryDate = subExpiry.trim() === "" ? null : new Date(subExpiry.trim());
      setUsers((prev) =>
        prev.map((u) =>
          u.id === subscriptionTarget.id
            ? {
                ...u,
                plan: subPlan,
                planStatus: subStatus,
                planExpiry: expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null,
              }
            : u
        )
      );
      toast({ title: t("adminSubscriptionUpdateSuccessTitle") });
      setSubscriptionTarget(null);
      return;
    }
    toast({
      title: t("adminSubscriptionUpdateFailTitle"),
      description: "errorKey" in result ? t(result.errorKey) : undefined,
      variant: "destructive",
    });
  };

  const handleResetPassword = async () => {
    if (!passwordTarget) return;
    setIsPending(passwordTarget.id);
    const result = await resetUserPassword(passwordTarget.id, newPassword);
    setIsPending(null);
    if (result.success) {
      toast({ title: "รีเซ็ตรหัสผ่านสำเร็จ" });
      setPasswordTarget(null);
      setNewPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: result.errorKey, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsPending(deleteTarget.id);
    const result = await deleteUser(deleteTarget.id);
    setIsPending(null);

    if (result.success) {
      setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id));
      router.refresh();
      toast({
        title: t("adminUserDeleteSuccessTitle"),
        description: t("adminUserDeleteSuccessDesc", {
          name: deleteTarget.name || deleteTarget.email || t("adminUserDisplayFallback"),
        }),
      });
    } else {
      toast({
        title: t("adminUserDeleteFailTitle"),
        description: "errorKey" in result ? t(result.errorKey) : t("adminUserDeleteFailDesc"),
        variant: "destructive",
      });
    }

    setDeleteTarget(null);
  };

  const roleOptions: Array<{
    value: AdminUsersRoleFilter;
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    { value: "ALL", label: t("adminFilterAll"), count: counts.admins + counts.teachers + counts.students + counts.users, icon: <Users className="h-4 w-4" /> },
    { value: "ADMIN", label: t("adminFilterAdmins"), count: counts.admins, icon: <ShieldCheck className="h-4 w-4" /> },
    { value: "TEACHER", label: t("adminFilterTeachers"), count: counts.teachers, icon: <UserCheck className="h-4 w-4" /> },
    { value: "STUDENT", label: t("adminFilterStudents"), count: counts.students, icon: <GraduationCap className="h-4 w-4" /> },
    { value: "USER", label: t("adminFilterNeedsRole"), count: counts.users, icon: <Users className="h-4 w-4" /> },
  ];

  const verificationOptions: Array<{
    value: AdminUsersVerificationFilter;
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    { value: "ALL", label: t("adminFilterAll"), count: counts.verified + counts.unverified, icon: <Users className="h-4 w-4" /> },
    { value: "VERIFIED", label: t("adminFilterVerified"), count: counts.verified, icon: <CheckCircle2 className="h-4 w-4" /> },
    { value: "UNVERIFIED", label: t("adminFilterUnverified"), count: counts.unverified, icon: <MailX className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={t("adminUserSearchPlaceholder")}
          className="h-11 rounded-xl border-slate-200 pl-10"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t("adminUsersRoleFilterLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((option) => {
                const isActive = roleFilter === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    className={`h-9 rounded-full border-slate-200 px-3 ${
                      isActive ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() =>
                      router.push(
                        buildAdminUsersListHref(LIST_PATH, {
                          q: query,
                          page: 1,
                          pageSize,
                          role: option.value,
                          verification: verificationFilter,
                        })
                      )
                    }
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.label}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/15" : "bg-slate-100 text-slate-500"}`}>
                      {option.count}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t("adminUsersVerificationFilterLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {verificationOptions.map((option) => {
                const isActive = verificationFilter === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    className={`h-9 rounded-full border-slate-200 px-3 ${
                      isActive ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() =>
                      router.push(
                        buildAdminUsersListHref(LIST_PATH, {
                          q: query,
                          page: 1,
                          pageSize,
                          role: roleFilter,
                          verification: option.value,
                        })
                      )
                    }
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.label}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/15" : "bg-slate-100 text-slate-500"}`}>
                      {option.count}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColUser")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColEmail")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColRole")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColVerification")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColDetails")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColJoined")}</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500">{t("adminUserColActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isTeacher = isTeacherRole(user.role);
                const isVerified = !!user.emailVerified;

                return (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                          {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                        </div>
                        <span className="font-bold text-slate-800">{user.name || t("adminNoName")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-2">
                        {user.role === "ADMIN" ? (
                          <ShieldCheck className="h-4 w-4 text-red-600" />
                        ) : user.role === "TEACHER" ? (
                          <UserIcon className="h-4 w-4 text-purple-600" />
                        ) : user.role === "STUDENT" ? (
                          <GraduationCap className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Users className="h-4 w-4 text-slate-400" />
                        )}
                        {user.role === "USER" ? t("adminRoleUserUnlinked") : user.role}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isVerified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MailX className="h-3.5 w-3.5" />}
                        {isVerified ? t("adminVerificationVerified") : t("adminVerificationPending")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {isTeacher ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-left hover:bg-slate-100"
                              onClick={() => setSubscriptionTarget(user)}
                            >
                              {user.plan ?? "FREE"}
                              <span className="ml-1 text-[10px] font-medium text-slate-400">
                                ({user.planStatus ?? "—"})
                              </span>
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500">{t("adminUserTeacherClassrooms", { count: user._count.classrooms })}</p>
                        </div>
                      ) : user.role === "STUDENT" ? (
                        <span>{t("adminUserStudentProfiles", { count: user._count.studentProfiles })}</span>
                      ) : user.role === "USER" ? (
                        <span className="font-semibold text-amber-700">{t("adminUserNeedsRoleDetails")}</span>
                      ) : (
                        <span>{t("adminUserAdminDetails")}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString(language === "th" ? "th-TH" : "en-US")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isPending === user.id}>
                            {isPending === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 p-2 shadow-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setPasswordTarget(user);
                              setNewPassword("");
                              setShowCurrentPassword(false);
                              setShowNewPassword(false);
                            }}
                            className="cursor-pointer gap-2 rounded-lg py-2 font-bold"
                          >
                            <Lock className="h-4 w-4 text-orange-500" />
                            ตั้งรหัสผ่านใหม่
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(user)}
                            className="cursor-pointer gap-2 rounded-lg py-2 font-bold text-red-600 focus:bg-red-50 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("adminDeleteUser")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Users className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                    <p className="font-medium text-slate-400">{t("adminNoUsersFound")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">
            {t("adminUsersPaginationSummary", {
              from: String(rangeFrom),
              to: String(rangeTo),
              total: String(total),
            })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
              {t("adminUsersPageSizeLabel")}
              <select
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
                value={pageSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value) as AdminUsersPageSize;
                  router.push(
                    buildAdminUsersListHref(LIST_PATH, {
                      q: query,
                      page: 1,
                      pageSize: nextSize,
                      role: roleFilter,
                      verification: verificationFilter,
                    })
                  );
                }}
              >
                {ADMIN_USERS_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs font-bold text-slate-400">
              {t("adminUsersPageIndicator", { page: String(page), totalPages: String(totalPages) })}
            </span>
            {prevHref ? (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" asChild>
                <Link href={prevHref}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("adminUsersPagePrev")}
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" disabled>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("adminUsersPagePrev")}
              </Button>
            )}
            {nextHref ? (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" asChild>
                <Link href={nextHref}>
                  {t("adminUsersPageNext")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" disabled>
                {t("adminUsersPageNext")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!subscriptionTarget} onOpenChange={(open) => !open && setSubscriptionTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminSubscriptionDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-slate-500">{t("adminPlanLabel")}</Label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                value={subPlan}
                onChange={(e) => setSubPlan(e.target.value as "FREE" | "PLUS" | "PRO")}
              >
                <option value="FREE">{t("adminPlanFree")}</option>
                <option value="PLUS">{t("adminPlanPlus")}</option>
                <option value="PRO">{t("adminPlanPro")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-slate-500">{t("adminPlanStatusLabel")}</Label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value as "ACTIVE" | "EXPIRED" | "INACTIVE")}
              >
                <option value="ACTIVE">{t("adminPlanStatusActive")}</option>
                <option value="EXPIRED">{t("adminPlanStatusExpired")}</option>
                <option value="INACTIVE">{t("adminPlanStatusInactive")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-slate-500">{t("adminPlanExpiryLabel")}</Label>
              <Input
                type="date"
                className="rounded-xl"
                value={subExpiry}
                onChange={(e) => setSubExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setSubscriptionTarget(null)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={!!isPending}
              onClick={() => void handleSaveSubscription()}
              className="font-bold"
            >
              {isPending === subscriptionTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminSaveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordTarget(null);
            setNewPassword("");
            setShowCurrentPassword(false);
            setShowNewPassword(false);
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-500" />
              รหัสผ่าน
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase text-slate-500">ผู้ใช้</p>
              <p className="font-bold text-slate-800">
                {passwordTarget?.name || passwordTarget?.email || "—"}
              </p>
              <p className="text-xs text-slate-500">{passwordTarget?.email}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase text-slate-500">รหัสผ่านปัจจุบัน</p>
              {passwordTarget?.hasPassword ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-base font-bold tracking-widest text-slate-700">
                    {showCurrentPassword
                      ? <span className="text-xs font-normal text-slate-400 tracking-normal">รหัสผ่านถูกเข้ารหัส (bcrypt) ไม่สามารถดูค่าจริงได้</span>
                      : "●●●●●●●●"}
                  </p>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium text-amber-600">ยังไม่มีรหัสผ่าน (ใช้ OAuth เท่านั้น)</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-slate-500">
                ตั้งรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  className="rounded-xl pr-10"
                  placeholder="กรอกรหัสผ่านใหม่"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowNewPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPasswordTarget(null)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={newPassword.length < 6 || isPending === passwordTarget?.id}
              onClick={() => void handleResetPassword()}
              className="font-bold"
            >
              {isPending === passwordTarget?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "บันทึกรหัสผ่าน"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminDeleteUserConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminDeleteUserConfirmDesc", {
                name:
                  deleteTarget?.name ||
                  deleteTarget?.email ||
                  t("adminUserDisplayFallback"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isPending}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={!!isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending === deleteTarget?.id ? t("adminDeleteUserPending") : t("adminDeleteUserAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
