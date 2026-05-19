import { describe, expect, it } from "vitest";
import {
  ADMIN_USERS_PAGE_SIZE_DEFAULT,
  buildAdminUsersListHref,
  clampAdminUsersPage,
  parseAdminUsersSearchParams,
} from "@/lib/admin-users-pagination";

describe("admin-users-pagination", () => {
  it("parses defaults", () => {
    expect(parseAdminUsersSearchParams({})).toEqual({
      q: "",
      page: 1,
      pageSize: ADMIN_USERS_PAGE_SIZE_DEFAULT,
    });
  });

  it("parses query, page, and page size", () => {
    expect(parseAdminUsersSearchParams({ q: " anna ", page: "3", pageSize: "50" })).toEqual({
      q: "anna",
      page: 3,
      pageSize: 50,
    });
  });

  it("falls back for invalid page size and page", () => {
    expect(parseAdminUsersSearchParams({ page: "-1", pageSize: "999" })).toEqual({
      q: "",
      page: 1,
      pageSize: ADMIN_USERS_PAGE_SIZE_DEFAULT,
    });
  });

  it("clamps page to total pages", () => {
    expect(clampAdminUsersPage(99, 109, 25)).toBe(5);
    expect(clampAdminUsersPage(1, 0, 25)).toBe(1);
  });

  it("builds list hrefs", () => {
    expect(buildAdminUsersListHref("/admin/users", { q: "test", page: 2, pageSize: 50 })).toBe(
      "/admin/users?q=test&page=2&pageSize=50"
    );
    expect(buildAdminUsersListHref("/admin/users", {})).toBe("/admin/users");
  });
});
