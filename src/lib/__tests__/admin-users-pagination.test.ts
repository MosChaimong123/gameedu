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
      role: "ALL",
      verification: "ALL",
    });
  });

  it("parses query, page, page size, and filters", () => {
    expect(parseAdminUsersSearchParams({ q: " anna ", page: "3", pageSize: "50", role: "teacher", verification: "verified" })).toEqual({
      q: "anna",
      page: 3,
      pageSize: 50,
      role: "TEACHER",
      verification: "VERIFIED",
    });
  });

  it("falls back for invalid page size and page", () => {
    expect(parseAdminUsersSearchParams({ page: "-1", pageSize: "999", role: "oops", verification: "nope" })).toEqual({
      q: "",
      page: 1,
      pageSize: ADMIN_USERS_PAGE_SIZE_DEFAULT,
      role: "ALL",
      verification: "ALL",
    });
  });

  it("clamps page to total pages", () => {
    expect(clampAdminUsersPage(99, 109, 25)).toBe(5);
    expect(clampAdminUsersPage(1, 0, 25)).toBe(1);
  });

  it("builds list hrefs", () => {
    expect(
      buildAdminUsersListHref("/admin/users", {
        q: "test",
        page: 2,
        pageSize: 50,
        role: "TEACHER",
        verification: "VERIFIED",
      })
    ).toBe(
      "/admin/users?q=test&page=2&pageSize=50&role=TEACHER&verification=VERIFIED"
    );
    expect(buildAdminUsersListHref("/admin/users", {})).toBe("/admin/users");
  });
});
