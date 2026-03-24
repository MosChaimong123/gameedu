import { NextResponse } from "next/server";
import { RPG_COPY } from "./rpg-copy";

export const RPG_ROUTE_ERROR = {
  studentNotFound: "STUDENT_NOT_FOUND",
  insufficientGold: "INSUFFICIENT_GOLD",
  insufficientPoints: "INSUFFICIENT_POINTS",
  itemNotFound: "ITEM_NOT_FOUND",
  insufficientQuantity: "INSUFFICIENT_QUANTITY",
  skillNotFound: "SKILL_NOT_FOUND",
  skillUpgradeBlocked: "SKILL_UPGRADE_BLOCKED",
} as const;

export type RpgRouteErrorCode =
  (typeof RPG_ROUTE_ERROR)[keyof typeof RPG_ROUTE_ERROR];

export class RpgRouteError extends Error {
  code: RpgRouteErrorCode;

  constructor(code: RpgRouteErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "RpgRouteError";
  }
}

export function isRpgRouteError(error: unknown): error is RpgRouteError {
  return error instanceof RpgRouteError;
}

export function toShopErrorResponse(error: unknown) {
  if (!isRpgRouteError(error)) return null;

  switch (error.code) {
    case RPG_ROUTE_ERROR.studentNotFound:
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    case RPG_ROUTE_ERROR.insufficientGold:
      return NextResponse.json({ error: RPG_COPY.shop.insufficientGold }, { status: 400 });
    case RPG_ROUTE_ERROR.insufficientPoints:
      return NextResponse.json({ error: RPG_COPY.shop.insufficientPoints }, { status: 400 });
    default:
      return null;
  }
}

export function toInventoryUseErrorResponse(error: unknown) {
  if (isRpgRouteError(error)) {
    switch (error.code) {
      case RPG_ROUTE_ERROR.itemNotFound:
        return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
      case RPG_ROUTE_ERROR.insufficientQuantity:
        return NextResponse.json({ error: RPG_COPY.inventory.insufficientQuantity }, { status: 400 });
      case RPG_ROUTE_ERROR.studentNotFound:
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      default:
        return null;
    }
  }

  if (error instanceof Error && error.message.includes("COMMON")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return null;
}

export function toSkillTreeErrorResponse(error: unknown) {
  if (!isRpgRouteError(error)) return null;

  switch (error.code) {
    case RPG_ROUTE_ERROR.studentNotFound:
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    case RPG_ROUTE_ERROR.insufficientGold:
      return NextResponse.json({ error: RPG_COPY.shop.insufficientGold }, { status: 400 });
    case RPG_ROUTE_ERROR.skillNotFound:
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    case RPG_ROUTE_ERROR.skillUpgradeBlocked:
      return NextResponse.json({ error: error.message || "Skill upgrade blocked" }, { status: 400 });
    default:
      return null;
  }
}
