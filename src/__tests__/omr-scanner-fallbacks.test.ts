import { describe, expect, it } from "vitest";
import {
  getOmrCameraErrorMessage,
  parseOmrScannerQaFlags,
} from "@/lib/omr-scanner-fallbacks";

const t = (key: string) => key;

describe("omr scanner fallbacks", () => {
  it("parses QA flags from search params", () => {
    expect(
      parseOmrScannerQaFlags("?omrQaCamera=denied&omrQaCv=error&omrQaProcess=success&omrQaSaveResult=error")
    ).toEqual({
      forceCameraError: "denied",
      forceCvError: true,
      forceProcessSuccess: true,
      forceSaveResultError: true,
    });
  });

  it("maps camera permission errors to the permission message", () => {
    expect(getOmrCameraErrorMessage({ name: "NotAllowedError" }, t)).toBe(
      "omrCameraPermissionDenied"
    );
  });

  it("maps camera missing errors to the missing-device message", () => {
    expect(getOmrCameraErrorMessage({ name: "NotFoundError" }, t)).toBe(
      "omrCameraNotFound"
    );
  });

  it("maps camera busy errors to the busy-camera message", () => {
    expect(getOmrCameraErrorMessage({ name: "NotReadableError" }, t)).toBe(
      "omrCameraBusy"
    );
  });

  it("lets QA flags force a deterministic camera error state", () => {
    expect(getOmrCameraErrorMessage(null, t, { forceCameraError: "busy" })).toBe(
      "omrCameraBusy"
    );
  });
});
