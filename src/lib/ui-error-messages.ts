import type { AppErrorCode } from "@/lib/api-error";
import type { Language } from "@/lib/translations";

type ThaiErrorMessageOverrides = Partial<Record<AppErrorCode, string>>;

type ApiErrorBody =
    | {
          error?: string | { code?: AppErrorCode; message?: string };
          message?: string;
      }
    | null
    | undefined;

const DEFAULT_THAI_ERROR_MESSAGES: Record<AppErrorCode, string> = {
    AUTH_REQUIRED: "กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ",
    FORBIDDEN: "คุณไม่มีสิทธิ์ทำรายการนี้",
    INVALID_LOGIN_CODE: "ไม่พบรหัสเข้าใช้งานนี้ กรุณาตรวจสอบอีกครั้ง",
    LOGIN_CODE_ALREADY_LINKED: "รหัสนี้ถูกเชื่อมกับบัญชีอื่นแล้ว",
    ALREADY_IN_CLASSROOM: "บัญชีนี้เข้าร่วมห้องเรียนนี้อยู่แล้ว",
    RATE_LIMITED: "คุณลองหลายครั้งเกินไป โปรดรอสักครู่แล้วลองใหม่",
    INVALID_PAYLOAD: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
    NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ",
    NO_FILE: "กรุณาเลือกไฟล์ก่อนอัปโหลด",
    UNSUPPORTED_FILE_TYPE: "ชนิดไฟล์นี้ยังไม่รองรับ",
    FILE_TOO_LARGE: "ไฟล์มีขนาดใหญ่เกินกำหนด",
    INTERNAL_ERROR: "เกิดข้อผิดพลาดภายในระบบ โปรดลองอีกครั้งภายหลัง",
    QUIZ_ALL_REQUIRED: "ต้องตอบให้ครบทุกข้อก่อนส่ง",
    NEGAMON_NOT_ENABLED: "ห้องนี้ยังไม่เปิดใช้งาน Negamon",
    NEGAMON_SELECTION_DISABLED: "ครูไม่อนุญาตให้เลือกมอนสเตอร์เอง",
    NEGAMON_INVALID_SPECIES: "มอนสเตอร์นี้ไม่อยู่ในรายการที่อนุญาต",
    NEGAMON_PASSIVES_DISABLED: "ระบบสกิลพาสซีฟ Negamon ถูกปิดใช้งานแล้ว",
    NEGAMON_PASSIVE_NOT_FOUND: "ไม่พบสกิลนี้",
    NEGAMON_PASSIVE_ALREADY_UNLOCKED: "ปลดล็อกสกิลนี้แล้ว",
    INVALID_BATTLE_LOADOUT: "ชุดไอเทมต่อสู้ไม่ถูกต้อง",
    NOT_ENOUGH_GOLD: "ทองไม่พอ",
    SHOP_ITEM_NOT_FOUND: "ไม่พบไอเทมนี้",
    SHOP_ALREADY_OWNED: "คุณมีไอเทมนี้แล้ว",
    PLAN_LIMIT_QUESTION_SETS: "จำนวนชุดคำถามถึงขีดจำกัดของแผนแล้ว",
    PLAN_LIMIT_QUESTIONS_PER_SET: "จำนวนข้อในชุดเกินขีดจำกัดของแผน",
    PLAN_LIMIT_OMR_MONTHLY: "ใช้โควต้าสแกน OMR รายเดือนครบแล้ว",
    PLAN_LIMIT_LIVE_PLAYERS: "ห้องเต็มตามขีดจำกัดผู้เล่นของแผนโฮสต์",
    PLAN_LIMIT_AI_FEATURE: "ฟีเจอร์ AI ไม่รวมในแผนปัจจุบัน",
    PLAN_LIMIT_CLASSROOMS: "จำนวนห้องเรียนถึงขีดจำกัดของแผนแล้ว",
    PLAN_LIMIT_NEGAMON_SPECIES: "การเลือกสายพันธุ์ Negamon เกินขีดจำกัดของแผน",
    PLAN_LIMIT_AUDIENCE_PLANS: "ต้องเลือกแผนเป้าหมายอย่างน้อยหนึ่งแผน",
};

const LEGACY_TEXT_ERROR_MESSAGES: Array<[needle: string, message: string]> = [
    ["Too many login attempts", "คุณพยายามเข้าสู่ระบบหลายครั้งเกินไป โปรดรอสักครู่แล้วลองใหม่"],
    ["Too many requests", DEFAULT_THAI_ERROR_MESSAGES.RATE_LIMITED],
    ["Email already exists", "อีเมลนี้ถูกใช้งานแล้ว"],
    ["Username already taken", "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว"],
    ["Invalid data:", "ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"],
    ["Registration failed", "สมัครสมาชิกไม่สำเร็จ"],
    ["CredentialsSignin", "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่"],
];

/** Same needles as `LEGACY_TEXT_ERROR_MESSAGES` — English copy for non-TH UI. */
const LEGACY_EN_TEXT_ERROR_MESSAGES: Array<[needle: string, message: string]> = [
    ["Too many login attempts", "Too many sign-in attempts. Please wait a moment and try again."],
    ["Too many requests", "Too many attempts. Please wait a moment and try again."],
    ["Email already exists", "This email is already in use."],
    ["Username already taken", "This username is already taken."],
    ["Invalid data:", "Some fields look invalid. Please check and try again."],
    ["Registration failed", "We couldn't complete signup. Please try again."],
    ["CredentialsSignin", "Invalid email or password. Please try again."],
];

export function getThaiErrorMessage(
    code: AppErrorCode,
    fallback: string,
    overrides?: ThaiErrorMessageOverrides
) {
    return overrides?.[code] ?? DEFAULT_THAI_ERROR_MESSAGES[code] ?? fallback;
}

/** Resolve API `AppErrorCode` using `translations` keys `apiError_*` and optional per-flow overrides. */
export function getLocalizedAppErrorMessage(
    code: AppErrorCode,
    fallback: string,
    t: (key: string, params?: Record<string, string | number>) => string,
    overrideTranslationKeys?: Partial<Record<AppErrorCode, string>>
): string {
    const overrideKey = overrideTranslationKeys?.[code];
    if (overrideKey) {
        const msg = t(overrideKey);
        if (msg !== overrideKey) return msg;
    }
    const key = `apiError_${code}`;
    const msg = t(key);
    if (msg !== key) return msg;
    return fallback;
}

const LEGACY_API_ERROR_STRING_KEYS: Record<string, string> = {
    "Not enough gold": "apiError_NOT_ENOUGH_GOLD",
    "Not found": "apiError_NOT_FOUND",
    "Skill not found": "apiError_NEGAMON_PASSIVE_NOT_FOUND",
    "Already unlocked": "apiError_NEGAMON_PASSIVE_ALREADY_UNLOCKED",
    "Item not found": "apiError_SHOP_ITEM_NOT_FOUND",
    "Already owned": "apiError_SHOP_ALREADY_OWNED",
};

/**
 * Parse JSON error bodies from `fetch` / Axios (`{ error: { code, message } }` or legacy `{ error: string }`).
 */
export function getLocalizedMessageFromApiErrorBody(
    body: unknown,
    t: (key: string, params?: Record<string, string | number>) => string,
    options?: { fallbackTranslationKey?: string }
): string {
    const fallbackKey = options?.fallbackTranslationKey ?? "toastGenericError";
    const fallback = t(fallbackKey);

    if (!body || typeof body !== "object") {
        return fallback;
    }

    const o = body as Record<string, unknown>;
    const err = o.error;

    if (err && typeof err === "object" && err !== null && "code" in err) {
        const rawCode = (err as { code: unknown }).code;
        const errRecord = err as Record<string, unknown>;
        const msg =
            typeof errRecord.message === "string"
                ? errRecord.message
                : fallback;
        if (typeof rawCode === "string" && rawCode in DEFAULT_THAI_ERROR_MESSAGES) {
            return getLocalizedAppErrorMessage(rawCode as AppErrorCode, msg, t);
        }
        return msg;
    }

    if (typeof err === "string") {
        const mapKey = LEGACY_API_ERROR_STRING_KEYS[err];
        if (mapKey) {
            const localized = t(mapKey);
            if (localized !== mapKey) return localized;
        }
        return err;
    }

    return fallback;
}

export function getThaiErrorMessageFromLegacyText(message: string, fallback?: string) {
    const matched = LEGACY_TEXT_ERROR_MESSAGES.find(([needle]) => message.includes(needle));
    return matched?.[1] ?? fallback ?? message;
}

export function getThaiErrorMessageFromAuthResult(error: string | null | undefined) {
    if (!error) {
        return "เกิดข้อผิดพลาดในการเข้าสู่ระบบ โปรดลองอีกครั้ง";
    }

    return getThaiErrorMessageFromLegacyText(
        error,
        "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่"
    );
}

export function getLocalizedAuthErrorMessage(
    error: string | null | undefined,
    language: Language,
    t: (key: string, params?: Record<string, string | number>) => string
) {
    if (!error) {
        return t("loginAuthErrorUnknown");
    }
    if (language === "th") {
        return getThaiErrorMessageFromAuthResult(error);
    }
    const matched = LEGACY_EN_TEXT_ERROR_MESSAGES.find(([needle]) => error.includes(needle));
    return matched?.[1] ?? t("loginAuthErrorInvalidCredentials");
}

function getLocalizedLegacyApiMessage(
    message: string,
    language: Language,
    t: (key: string, params?: Record<string, string | number>) => string,
    fallbackTranslationKey: string
) {
    if (language === "th") {
        return getThaiErrorMessageFromLegacyText(message, t(fallbackTranslationKey));
    }
    const matched = LEGACY_EN_TEXT_ERROR_MESSAGES.find(([needle]) => message.includes(needle));
    return matched?.[1] ?? t(fallbackTranslationKey);
}

export async function getLocalizedErrorMessageFromResponse(
    response: Response,
    fallbackTranslationKey: string,
    t: (key: string, params?: Record<string, string | number>) => string,
    language: Language,
    options?: { overrideTranslationKeys?: Partial<Record<AppErrorCode, string>> }
) {
    const fallback = t(fallbackTranslationKey);
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
        const body = (await response.json()) as ApiErrorBody;

        if (body?.error && typeof body.error === "object" && body.error.code) {
            return getLocalizedAppErrorMessage(
                body.error.code,
                typeof body.error.message === "string" ? body.error.message : fallback,
                t,
                options?.overrideTranslationKeys
            );
        }

        if (typeof body?.error === "string") {
            return getLocalizedLegacyApiMessage(body.error, language, t, fallbackTranslationKey);
        }

        if (typeof body?.message === "string") {
            return getLocalizedLegacyApiMessage(body.message, language, t, fallbackTranslationKey);
        }

        return fallback;
    }

    const text = await response.text();
    if (!text) {
        return fallback;
    }

    return getLocalizedLegacyApiMessage(text, language, t, fallbackTranslationKey);
}

export async function getThaiErrorMessageFromResponse(
    response: Response,
    fallback: string,
    overrides?: ThaiErrorMessageOverrides
) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
        const body = (await response.json()) as ApiErrorBody;

        if (body?.error && typeof body.error === "object" && body.error.code) {
            return getThaiErrorMessage(
                body.error.code,
                body.error.message ?? fallback,
                overrides
            );
        }

        if (typeof body?.error === "string") {
            return getThaiErrorMessageFromLegacyText(body.error, fallback);
        }

        if (typeof body?.message === "string") {
            return getThaiErrorMessageFromLegacyText(body.message, fallback);
        }

        return fallback;
    }

    const text = await response.text();
    if (!text) {
        return fallback;
    }

    return getThaiErrorMessageFromLegacyText(text, fallback);
}

/**
 * Browser `fetch` often throws/rejects with English-only messages like "Failed to fetch".
 * Returns a translated string when recognized; otherwise `null` so callers can keep their own path.
 */
export function tryLocalizeFetchNetworkFailureMessage(
    raw: string | null | undefined,
    t: (key: string, params?: Record<string, string | number>) => string
): string | null {
    const s = (raw ?? "").trim().toLowerCase();
    if (!s) return null;
    if (
        s === "failed to fetch" ||
        s === "load failed" ||
        s.includes("networkerror") ||
        s.includes("network request failed")
    ) {
        const msg = t("errorNetworkUnavailable");
        return msg !== "errorNetworkUnavailable" ? msg : null;
    }
    return null;
}
