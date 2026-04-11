import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages";
import type { Language } from "@/lib/translations";
import type { AppErrorCode } from "@/lib/api-error";

const OMR_ERROR_OVERRIDE_KEYS: Partial<Record<AppErrorCode, string>> = {
    AUTH_REQUIRED: "omrErrAuthRequired",
    FORBIDDEN: "omrErrForbidden",
    INVALID_PAYLOAD: "omrErrInvalidPayload",
    NOT_FOUND: "omrErrNotFound",
};

export async function getLocalizedOmrErrorMessageFromResponse(
    response: Response,
    fallbackTranslationKey: string,
    t: (key: string, params?: Record<string, string | number>) => string,
    language: Language
) {
    return getLocalizedErrorMessageFromResponse(
        response,
        fallbackTranslationKey,
        t,
        language,
        { overrideTranslationKeys: OMR_ERROR_OVERRIDE_KEYS }
    );
}
