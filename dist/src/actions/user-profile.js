"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = updateProfile;
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const cache_1 = require("next/cache");
async function updateProfile(data) {
    var _a;
    try {
        console.log("[ACTION_UPDATE_PROFILE] Start", { name: data.name, hasImage: !!data.image });
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            console.error("[ACTION_UPDATE_PROFILE] Unauthorized - No user ID");
            return { error: "Unauthorized: Please log in again" };
        }
        console.log(`[ACTION_UPDATE_PROFILE] DB Update for ${session.user.id}...`);
        const updated = await db_1.db.user.update({
            where: { id: session.user.id },
            data: {
                name: data.name,
                image: data.image
            }
        });
        console.log("[ACTION_UPDATE_PROFILE] DB Success");
        (0, cache_1.revalidatePath)("/dashboard");
        (0, cache_1.revalidatePath)("/dashboard/profile");
        return { success: true, name: updated.name };
    }
    catch (error) {
        console.error("[ACTION_UPDATE_PROFILE] CRITICAL ERROR:", error);
        return { error: error.message || "Unknown server error" };
    }
}
