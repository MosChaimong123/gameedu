import { NextResponse } from "next/server";

export const AUTH_REQUIRED_MESSAGE = "Unauthorized";
export const FORBIDDEN_MESSAGE = "Forbidden";
export const INTERNAL_ERROR_MESSAGE = "Internal Server Error";

export type AppErrorCode =
    | "AUTH_REQUIRED"
    | "FORBIDDEN"
    | "INVALID_LOGIN_CODE"
    | "LOGIN_CODE_ALREADY_LINKED"
    | "ALREADY_IN_CLASSROOM"
    | "RATE_LIMITED"
    | "INVALID_PAYLOAD"
    | "NOT_FOUND"
    | "NO_FILE"
    | "UNSUPPORTED_FILE_TYPE"
    | "FILE_TOO_LARGE"
    | "INTERNAL_ERROR"
    | "QUIZ_ALL_REQUIRED"
    | "NEGAMON_NOT_ENABLED"
    | "NEGAMON_SELECTION_DISABLED"
    | "NEGAMON_INVALID_SPECIES"
    | "NEGAMON_PASSIVES_DISABLED"
    | "NEGAMON_PASSIVE_NOT_FOUND"
    | "NEGAMON_PASSIVE_ALREADY_UNLOCKED"
    | "INVALID_BATTLE_LOADOUT"
    | "NOT_ENOUGH_GOLD"
    | "SHOP_ITEM_NOT_FOUND"
    | "SHOP_ALREADY_OWNED"
    | "PLAN_LIMIT_QUESTION_SETS"
    | "PLAN_LIMIT_QUESTIONS_PER_SET"
    | "PLAN_LIMIT_OMR_MONTHLY"
    | "PLAN_LIMIT_LIVE_PLAYERS"
    | "PLAN_LIMIT_AI_FEATURE"
    | "PLAN_LIMIT_CLASSROOMS"
    | "PLAN_LIMIT_NEGAMON_SPECIES"
    | "PLAN_LIMIT_AUDIENCE_PLANS";

export type AppErrorPayload = {
    error: {
        code: AppErrorCode;
        message: string;
    };
};

export function createAppError(code: AppErrorCode, message: string): AppErrorPayload {
    return {
        error: {
            code,
            message,
        },
    };
}

export function createAppErrorResponse(
    code: AppErrorCode,
    message: string,
    status: number,
    init?: ResponseInit
): NextResponse {
    return NextResponse.json(createAppError(code, message), {
        ...init,
        status,
        headers: {
            ...(init?.headers ?? {}),
        },
    });
}
