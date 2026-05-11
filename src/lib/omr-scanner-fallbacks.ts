export type OmrScannerQaFlags = {
    forceCameraError: null | "denied" | "missing" | "busy";
    forceCvError: boolean;
    forceProcessSuccess: boolean;
    forceSaveResultError: boolean;
};

export function parseOmrScannerQaFlags(search: string): OmrScannerQaFlags {
    const params = new URLSearchParams(search);
    const camera = params.get("omrQaCamera");
    return {
        forceCameraError:
            camera === "denied" || camera === "missing" || camera === "busy"
                ? camera
                : null,
        forceCvError: params.get("omrQaCv") === "error",
        forceProcessSuccess: params.get("omrQaProcess") === "success",
        forceSaveResultError: params.get("omrQaSaveResult") === "error",
    };
}

export function getOmrCameraErrorMessage(
    error: unknown,
    t: (key: string) => string,
    flags?: Partial<OmrScannerQaFlags>
) {
    const forced = flags?.forceCameraError;
    if (forced === "denied") return t("omrCameraPermissionDenied");
    if (forced === "missing") return t("omrCameraNotFound");
    if (forced === "busy") return t("omrCameraBusy");

    if (error && typeof error === "object" && "name" in error) {
        const name = String(error.name);
        if (name === "NotAllowedError" || name === "SecurityError") {
            return t("omrCameraPermissionDenied");
        }
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
            return t("omrCameraNotFound");
        }
        if (name === "NotReadableError" || name === "TrackStartError") {
            return t("omrCameraBusy");
        }
    }

    return t("omrCameraError");
}
