"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpgRouteError = exports.RPG_ROUTE_ERROR = void 0;
exports.isRpgRouteError = isRpgRouteError;
exports.toShopErrorResponse = toShopErrorResponse;
exports.toInventoryUseErrorResponse = toInventoryUseErrorResponse;
exports.toSkillTreeErrorResponse = toSkillTreeErrorResponse;
const server_1 = require("next/server");
const rpg_copy_1 = require("./rpg-copy");
exports.RPG_ROUTE_ERROR = {
    studentNotFound: "STUDENT_NOT_FOUND",
    insufficientGold: "INSUFFICIENT_GOLD",
    insufficientPoints: "INSUFFICIENT_POINTS",
    itemNotFound: "ITEM_NOT_FOUND",
    insufficientQuantity: "INSUFFICIENT_QUANTITY",
    skillNotFound: "SKILL_NOT_FOUND",
    skillUpgradeBlocked: "SKILL_UPGRADE_BLOCKED",
};
class RpgRouteError extends Error {
    constructor(code, message) {
        super(message !== null && message !== void 0 ? message : code);
        this.code = code;
        this.name = "RpgRouteError";
    }
}
exports.RpgRouteError = RpgRouteError;
function isRpgRouteError(error) {
    return error instanceof RpgRouteError;
}
function toShopErrorResponse(error) {
    if (!isRpgRouteError(error))
        return null;
    switch (error.code) {
        case exports.RPG_ROUTE_ERROR.studentNotFound:
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        case exports.RPG_ROUTE_ERROR.insufficientGold:
            return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.shop.insufficientGold }, { status: 400 });
        case exports.RPG_ROUTE_ERROR.insufficientPoints:
            return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.shop.insufficientPoints }, { status: 400 });
        default:
            return null;
    }
}
function toInventoryUseErrorResponse(error) {
    if (isRpgRouteError(error)) {
        switch (error.code) {
            case exports.RPG_ROUTE_ERROR.itemNotFound:
                return server_1.NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
            case exports.RPG_ROUTE_ERROR.insufficientQuantity:
                return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.inventory.insufficientQuantity }, { status: 400 });
            case exports.RPG_ROUTE_ERROR.studentNotFound:
                return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
            default:
                return null;
        }
    }
    if (error instanceof Error && error.message.includes("COMMON")) {
        return server_1.NextResponse.json({ error: error.message }, { status: 400 });
    }
    return null;
}
function toSkillTreeErrorResponse(error) {
    if (!isRpgRouteError(error))
        return null;
    switch (error.code) {
        case exports.RPG_ROUTE_ERROR.studentNotFound:
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        case exports.RPG_ROUTE_ERROR.insufficientGold:
            return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.shop.insufficientGold }, { status: 400 });
        case exports.RPG_ROUTE_ERROR.skillNotFound:
            return server_1.NextResponse.json({ error: "Skill not found" }, { status: 404 });
        case exports.RPG_ROUTE_ERROR.skillUpgradeBlocked:
            return server_1.NextResponse.json({ error: error.message || "Skill upgrade blocked" }, { status: 400 });
        default:
            return null;
    }
}
