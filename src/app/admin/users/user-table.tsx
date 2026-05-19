"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import {
  ADMIN_USERS_PAGE_SIZE_OPTIONS,
  buildAdminUsersListHref,
  type AdminUsersPageSize,
} from "@/lib/admin-users-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { deleteUser, updateUserRole, updateUserSubscription } from "../admin-actions";
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
}

type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

type UserTableProps = {
  users: User[];
  total: number;
  page: number;
  pageSize: AdminUsersPageSize;
  query: string;
};

const LIST_PATH = "/admin/users";

export function UserTable({ users: initialUsers, total, page, pageSize, query }: UserTableProps) {
  const router = useRouter();
  const [users, setUsers] = React.useState(initialUsers);
  const [searchTerm, setSearchTerm] = React.useState(query);
  const [isPending, setIsPending] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null);
  const [subscriptionTarget, setSubscriptionTarget] = React.useState<User | null>(null);
  const [subPlan, setSubPlan] = React.useState<"FREE" | "PLUS" | "PRO">("FREE");
  const [subStatus, setSubStatus] = React.useState<"ACTIVE" | "EXPIRED" | "INACTIVE">("INACTIVE");
  const [subExpiry, setSubExpiry] = React.useState<string>("");
  const { toast } = useToast();
  const { t } = useLanguage();

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
      router.push(buildAdminUsersListHref(LIST_PATH, { q: trimmed, page: 1, pageSize }));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchTerm, query, pageSize, router]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);
  const prevHref =
    page > 1 ? buildAdminUsersListHref(LIST_PATH, { q: query, page: page - 1, pageSize }) : null;
  const nextHref =
    page < totalPages ? buildAdminUsersListHref(LIST_PATH, { q: query, page: page + 1, pageSize }) : null;

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    setIsPending(userId);
    const result = await updateUserRole(userId, newRole);
    setIsPending(null);

    if (result.success) {
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)));
      toast({
        title: t("adminRoleUpdateSuccessTitle"),
        description: t("adminRoleUpdateSuccessDesc", { role: newRole }),
      });
      return;
    }

    toast({
      title: t("adminRoleUpdateFailTitle"),
      description: t(result.errorKey),
      variant: "destructive",
    });
  };

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

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case "ADMIN":
        return <ShieldCheck className="h-4 w-4 text-red-600" />;
      case "TEACHER":
        return <UserIcon className="h-4 w-4 text-purple-600" />;
      case "STUDENT":
        return <GraduationCap className="h-4 w-4 text-blue-600" />;
      case "USER":
      default:
        return <Users className="h-4 w-4 text-slate-400" />;
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case "ADMIN":
      case "TEACHER":
      case "STUDENT":
        return role;
      case "USER":
      default:
        return t("adminRoleUserUnlinked");
    }
  };

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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColUser")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColEmail")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColRole")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColPlan")}</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">{t("adminUserColJoined")}</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500">{t("adminUserColActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
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
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">
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
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isPending === user.id}>
                          {isPending === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 p-2 shadow-xl">
                        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {t("adminRoleChangeLabel")}
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "ADMIN")} className="cursor-pointer gap-2 rounded-lg py-2 font-bold">
                          <ShieldCheck className="h-4 w-4 text-red-600" />
                          {t("adminSetAsAdmin")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "TEACHER")} className="cursor-pointer gap-2 rounded-lg py-2 font-bold">
                          <UserIcon className="h-4 w-4 text-purple-600" />
                          {t("adminSetAsTeacher")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, "STUDENT")} className="cursor-pointer gap-2 rounded-lg py-2 font-bold">
                          <GraduationCap className="h-4 w-4 text-blue-600" />
                          {t("adminSetAsStudent")}
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
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
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
                  router.push(buildAdminUsersListHref(LIST_PATH, { q: query, page: 1, pageSize: nextSize }));
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
