"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = updateUserRole;
exports.deleteUser = deleteUser;
exports.deleteSet = deleteSet;
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const cache_1 = require("next/cache");
async function ensureAdmin() {
    var _a;
    const session = await (0, auth_1.auth)();
    const role = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.role;
    if (role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
}
async function updateUserRole(userId, newRole) {
    await ensureAdmin();
    try {
        await db_1.db.user.update({
            where: { id: userId },
            data: { role: newRole }
        });
        (0, cache_1.revalidatePath)("/admin");
        (0, cache_1.revalidatePath)("/admin/users");
        return { success: true };
    }
    catch (error) {
        console.error("Failed to update user role:", error);
        return { success: false, error: "Failed to update role" };
    }
}
async function deleteUser(userId) {
    await ensureAdmin();
    try {
        // Note: In a real app, we might want to handle cascading deletes or soft deletes
        await db_1.db.user.delete({
            where: { id: userId }
        });
        (0, cache_1.revalidatePath)("/admin");
        (0, cache_1.revalidatePath)("/admin/users");
        return { success: true };
    }
    catch (error) {
        console.error("Failed to delete user:", error);
        return { success: false, error: "Failed to delete user" };
    }
}
async function deleteSet(setId) {
    await ensureAdmin();
    try {
        await db_1.db.questionSet.delete({
            where: { id: setId }
        });
        (0, cache_1.revalidatePath)("/admin");
        (0, cache_1.revalidatePath)("/admin/sets");
        return { success: true };
    }
    catch (error) {
        console.error("Failed to delete set:", error);
        return { success: false, error: "Failed to delete set" };
    }
}
