import type { Prisma } from "@prisma/client";

export const ADMIN_USERS_PAGE_SIZE_DEFAULT = 25;
export const ADMIN_USERS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type AdminUsersPageSize = (typeof ADMIN_USERS_PAGE_SIZE_OPTIONS)[number];

export type AdminUsersListParams = {
  q: string;
  page: number;
  pageSize: AdminUsersPageSize;
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
  return { q, page, pageSize };
}

export function buildAdminUsersWhere(q: string): Prisma.UserWhereInput {
  if (!q) {
    return {};
  }
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ],
  };
}

export function clampAdminUsersPage(page: number, total: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

export function buildAdminUsersListHref(
  basePath: string,
  params: { q?: string; page?: number; pageSize?: number }
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
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
