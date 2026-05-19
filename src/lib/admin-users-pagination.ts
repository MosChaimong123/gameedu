import type { Prisma } from "@prisma/client";

export const ADMIN_USERS_PAGE_SIZE_DEFAULT = 25;
export const ADMIN_USERS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const ADMIN_USERS_ROLE_FILTERS = ["ALL", "ADMIN", "TEACHER", "STUDENT", "USER"] as const;
export const ADMIN_USERS_VERIFICATION_FILTERS = ["ALL", "VERIFIED", "UNVERIFIED"] as const;

export type AdminUsersPageSize = (typeof ADMIN_USERS_PAGE_SIZE_OPTIONS)[number];
export type AdminUsersRoleFilter = (typeof ADMIN_USERS_ROLE_FILTERS)[number];
export type AdminUsersVerificationFilter = (typeof ADMIN_USERS_VERIFICATION_FILTERS)[number];

export type AdminUsersListParams = {
  q: string;
  page: number;
  pageSize: AdminUsersPageSize;
  role: AdminUsersRoleFilter;
  verification: AdminUsersVerificationFilter;
};

export function parseAdminUsersSearchParams(
  raw: Record<string, string | string[] | undefined>
): AdminUsersListParams {
  const q = typeof raw.q === "string" ? raw.q.trim() : "";
  const pageSizeRaw = typeof raw.pageSize === "string" ? Number(raw.pageSize) : ADMIN_USERS_PAGE_SIZE_DEFAULT;
  const pageSize = (ADMIN_USERS_PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSizeRaw)
    ? (pageSizeRaw as AdminUsersPageSize)
    : ADMIN_USERS_PAGE_SIZE_DEFAULT;
  const pageRaw = typeof raw.page === "string" ? Number(raw.page) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const roleRaw = typeof raw.role === "string" ? raw.role.toUpperCase() : "ALL";
  const role = (ADMIN_USERS_ROLE_FILTERS as readonly string[]).includes(roleRaw)
    ? (roleRaw as AdminUsersRoleFilter)
    : "ALL";
  const verificationRaw =
    typeof raw.verification === "string" ? raw.verification.toUpperCase() : "ALL";
  const verification = (ADMIN_USERS_VERIFICATION_FILTERS as readonly string[]).includes(
    verificationRaw
  )
    ? (verificationRaw as AdminUsersVerificationFilter)
    : "ALL";
  return { q, page, pageSize, role, verification };
}

export function buildAdminUsersWhere(
  q: string,
  role: AdminUsersRoleFilter = "ALL",
  verification: AdminUsersVerificationFilter = "ALL"
): Prisma.UserWhereInput {
  const clauses: Prisma.UserWhereInput[] = [];

  if (q) {
    clauses.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (role !== "ALL") {
    clauses.push({ role });
  }

  if (verification === "VERIFIED") {
    clauses.push({ emailVerified: { not: null } });
  } else if (verification === "UNVERIFIED") {
    clauses.push({ emailVerified: null });
  }

  if (clauses.length === 0) {
    return {};
  }
  if (clauses.length === 1) {
    return clauses[0];
  }
  return { AND: clauses };
}

export function clampAdminUsersPage(page: number, total: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

export function buildAdminUsersListHref(
  basePath: string,
  params: {
    q?: string;
    page?: number;
    pageSize?: number;
    role?: AdminUsersRoleFilter;
    verification?: AdminUsersVerificationFilter;
  }
) {
  const search = new URLSearchParams();
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  if (params.pageSize && params.pageSize !== ADMIN_USERS_PAGE_SIZE_DEFAULT) {
    search.set("pageSize", String(params.pageSize));
  }
  if (params.role && params.role !== "ALL") {
    search.set("role", params.role);
  }
  if (params.verification && params.verification !== "ALL") {
    search.set("verification", params.verification);
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
