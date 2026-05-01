"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_ROLES = void 0;
exports.isAppRole = isAppRole;
exports.APP_ROLES = ["ADMIN", "TEACHER", "STUDENT", "USER"];
function isAppRole(value) {
    return typeof value === "string" && exports.APP_ROLES.includes(value);
}
