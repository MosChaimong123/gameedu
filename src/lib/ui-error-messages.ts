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
    ALREADY_IN_CLASSROOM: "บัญชีนี้อยู่ในห้องเรียนนี้แล้ว",
    RATE_LIMITED: "คุณลองหลายครั้งเกินไป โปรดรอสักครู่แล้วลองใหม่",
    INVALID_PAYLOAD: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
    REGISTER_EMAIL_ALREADY_EXISTS: "อีเมลนี้ลงทะเบียนแล้ว ลองเข้าสู่ระบบหรือใช้อีเมลอื่น",
    REGISTER_USERNAME_TAKEN: "ชื่อผู้ใช้ที่สร้างอัตโนมัติซ้ำกับผู้อื่น ลองอีกครั้งหรือใช้อีเมลอื่น",
    REGISTER_VERIFICATION_EMAIL_FAILED:
        "ระบบส่งอีเมลยืนยันไม่สำเร็จ (เช่น ยังไม่ตั้งค่า Resend หรือโดเมนส่งเมล) โปรดลองใหม่ภายหลังหรือสมัครด้วย Google",
    NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ",
    NO_FILE: "กรุณาเลือกไฟล์ก่อนอัปโหลด",
    UNSUPPORTED_FILE_TYPE: "ไฟล์ประเภทนี้ยังไม่รองรับ",
    FILE_TOO_LARGE: "ไฟล์มีขนาดใหญ่เกินกำหนด",
    INTERNAL_ERROR: "เกิดข้อผิดพลาดภายในระบบ โปรดลองอีกครั้งภายหลัง",
    QUIZ_ALL_REQUIRED: "ต้องตอบให้ครบทุกข้อก่อนส่ง",
    NEGAMON_NOT_ENABLED: "ห้องนี้ยังไม่ได้เปิดใช้ Negamon",
    NEGAMON_SELECTION_DISABLED: "ครูยังไม่อนุญาตให้นักเรียนเลือกมอนสเตอร์เอง",
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
    PLAN_LIMIT_OMR_MONTHLY: "ใช้โควตาสแกน OMR รายเดือนครบแล้ว",
    PLAN_LIMIT_LIVE_PLAYERS: "ห้องเต็มตามขีดจำกัดผู้เล่นของแผนโฮสต์",
    PLAN_LIMIT_AI_FEATURE: "ฟีเจอร์ AI นี้ไม่รวมในแผนปัจจุบัน",
    PLAN_LIMIT_CLASSROOMS: "จำนวนห้องเรียนถึงขีดจำกัดของแผนแล้ว",
    PLAN_LIMIT_NEGAMON_SPECIES: "การเลือกสายพันธุ์ Negamon เกินขีดจำกัดของแผน",
    PLAN_LIMIT_AUDIENCE_PLANS: "ต้องเลือกแผนเป้าหมายอย่างน้อยหนึ่งแผน",
    BILLING_NOT_CONFIGURED: "ระบบชำระเงินยังไม่ได้ตั้งค่า",
    BILLING_PRICE_NOT_CONFIGURED: "ยังไม่ได้ตั้งค่าราคาสำหรับรอบบิลนี้",
    BILLING_PRO_MANAGED: "บัญชี School Pro ถูกจัดการโดยองค์กรของคุณ กรุณาติดต่อทีมงานเรื่องการชำระเงิน",
    BILLING_CHECKOUT_CREATE_FAILED: "ไม่สามารถเริ่มหน้าชำระเงินได้ในขณะนี้",
    BILLING_THAI_NOT_CONFIGURED: "ช่องทางชำระเงินไทยยังไม่ได้ตั้งค่า",
    BILLING_CHARGE_SESSION_MISMATCH: "รายการชำระเงินนี้ไม่ตรงกับเซสชันปัจจุบัน",
    BILLING_PROCESSING_FAILED: "ระบบไม่สามารถยืนยันการชำระเงินให้เสร็จสมบูรณ์ได้",
    INVALID_ACCESSIBILITY_SETTINGS: "ค่าการช่วยการเข้าถึงไม่ถูกต้อง",
    ENDPOINT_NO_LONGER_AVAILABLE: "ปลายทางนี้ไม่ได้เปิดใช้งานแล้ว",
};

const LEGACY_TEXT_ERROR_MESSAGES: Array<[needle: string, message: string]> = [
    ["Too many login attempts", "คุณพยายามเข้าสู่ระบบหลายครั้งเกินไป โปรดรอสักครู่แล้วลองใหม่"],
    ["Too many requests", DEFAULT_THAI_ERROR_MESSAGES.RATE_LIMITED],
    ["Email already exists", "อีเมลนี้ถูกใช้งานแล้ว"],
    ["Username already taken", "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว"],
    ["Invalid data:", "ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"],
    ["Registration failed", "สมัครสมาชิกไม่สำเร็จ"],
    ["CredentialsSignin", "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่"],
    ["EMAIL_NOT_VERIFIED", "กรุณายืนยันอีเมลจากลิงก์ที่ส่งไปก่อนเข้าสู่ระบบ หรือกดส่งลิงก์ใหม่"],
    ["oauth_intent_failed", "ไม่สามารถเริ่มล็อกอิน Google ได้ โปรดลองอีกครั้ง"],
    ["Billing is not configured", DEFAULT_THAI_ERROR_MESSAGES.BILLING_NOT_CONFIGURED],
    ["Thai/local billing is not configured", DEFAULT_THAI_ERROR_MESSAGES.BILLING_THAI_NOT_CONFIGURED],
    ["Price not configured for interval", DEFAULT_THAI_ERROR_MESSAGES.BILLING_PRICE_NOT_CONFIGURED],
    ["School Pro accounts are managed by your organization", DEFAULT_THAI_ERROR_MESSAGES.BILLING_PRO_MANAGED],
    ["Could not create checkout session", DEFAULT_THAI_ERROR_MESSAGES.BILLING_CHECKOUT_CREATE_FAILED],
    ["Charge does not belong to this session", DEFAULT_THAI_ERROR_MESSAGES.BILLING_CHARGE_SESSION_MISMATCH],
    ["Processing failed", DEFAULT_THAI_ERROR_MESSAGES.BILLING_PROCESSING_FAILED],
    ["Invalid accessibility settings", DEFAULT_THAI_ERROR_MESSAGES.INVALID_ACCESSIBILITY_SETTINGS],
    ["No file uploaded", DEFAULT_THAI_ERROR_MESSAGES.NO_FILE],
    ["Unsupported file type", DEFAULT_THAI_ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE],
    ["File too large", DEFAULT_THAI_ERROR_MESSAGES.FILE_TOO_LARGE],
];

const LEGACY_EN_TEXT_ERROR_MESSAGES: Array<[needle: string, message: string]> = [
    ["Too many login attempts", "Too many sign-in attempts. Please wait a moment and try again."],
    ["Too many requests", "Too many attempts. Please wait a moment and try again."],
    ["Email already exists", "This email is already in use."],
    ["Username already taken", "This username is already taken."],
    ["Invalid data:", "Some fields look invalid. Please check and try again."],
    ["Registration failed", "We couldn't complete signup. Please try again."],
    ["CredentialsSignin", "Invalid email or password. Please try again."],
    ["EMAIL_NOT_VERIFIED", "Please verify your email using the link we sent before signing in, or request a new link."],
    ["oauth_intent_failed", "Could not start Google sign-in. Please try again."],
    ["Billing is not configured", "Billing is not configured right now."],
    ["Thai/local billing is not configured", "Thai/local billing is not configured right now."],
    ["Price not configured for interval", "This billing interval is not configured yet."],
    ["School Pro accounts are managed by your organization", "School Pro billing is managed by your organization."],
    ["Could not create checkout session", "Could not start checkout right now."],
    ["Charge does not belong to this session", "This payment does not belong to the current session."],
    ["Processing failed", "We couldn't finish processing the payment."],
    ["Invalid accessibility settings", "Accessibility settings are invalid."],
    ["No file uploaded", "Please choose a file before uploading."],
    ["Unsupported file type", "This file type is not supported."],
    ["File too large", "This file is too large."],
];

export function getThaiErrorMessage(
    code: AppErrorCode,
    fallback: string,
    overrides?: ThaiErrorMessageOverrides
) {
    return overrides?.[code] ?? DEFAULT_THAI_ERROR_MESSAGES[code] ?? fallback;
}

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
    "Billing is not configured": "apiError_BILLING_NOT_CONFIGURED",
    "Thai/local billing is not configured": "apiError_BILLING_THAI_NOT_CONFIGURED",
    "Price not configured for interval": "apiError_BILLING_PRICE_NOT_CONFIGURED",
    "Could not create checkout session": "apiError_BILLING_CHECKOUT_CREATE_FAILED",
    "Charge does not belong to this session.": "apiError_BILLING_CHARGE_SESSION_MISMATCH",
    "Charge does not belong to this session": "apiError_BILLING_CHARGE_SESSION_MISMATCH",
    "Processing failed": "apiError_BILLING_PROCESSING_FAILED",
    "Invalid accessibility settings": "apiError_INVALID_ACCESSIBILITY_SETTINGS",
    "No file uploaded": "apiError_NO_FILE",
    "Unsupported file type": "apiError_UNSUPPORTED_FILE_TYPE",
    "File too large": "apiError_FILE_TOO_LARGE",
};

function localizeDirectTranslationKey(
    key: string,
    t: (key: string, params?: Record<string, string | number>) => string
) {
    const localized = t(key);
    return localized !== key ? localized : null;
}

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
        const direct = localizeDirectTranslationKey(err, t);
        if (direct) return direct;
        const mapKey = LEGACY_API_ERROR_STRING_KEYS[err];
        if (mapKey) {
            const localized = t(mapKey);
            if (localized !== mapKey) return localized;
        }
        return err;
    }

    if (typeof o.message === "string") {
        const direct = localizeDirectTranslationKey(o.message, t);
        if (direct) return direct;
        const mapKey = LEGACY_API_ERROR_STRING_KEYS[o.message];
        if (mapKey) {
            const localized = t(mapKey);
            if (localized !== mapKey) return localized;
        }
        return o.message;
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
    if (error === "EMAIL_NOT_VERIFIED" || error.includes("EMAIL_NOT_VERIFIED")) {
        return "กรุณายืนยันอีเมลจากลิงก์ที่ส่งไปก่อนเข้าสู่ระบบ หรือกดส่งลิงก์ใหม่";
    }
    if (error === "oauth_intent_failed" || error.includes("oauth_intent_failed")) {
        return "ไม่สามารถเริ่มล็อกอิน Google ได้ โปรดลองอีกครั้ง";
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
    if (error === "RATE_LIMITED" || error === "rate_limited") {
        return t("loginAuthErrorRateLimited");
    }
    if (error === "EMAIL_NOT_VERIFIED" || error.includes("EMAIL_NOT_VERIFIED")) {
        return t("loginAuthErrorEmailNotVerified");
    }
    if (error === "oauth_intent_failed" || error.includes("oauth_intent_failed")) {
        return t("authOAuthIntentFailed");
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
