import { describe, expect, it } from "vitest";

import {
  getCsvInvalidFileMessage,
  getCsvMissingColumnsMessage,
  getCsvNoValidQuestionsMessage,
  getCsvParseErrorMessage,
  getCsvRequiredColumns,
} from "@/lib/set-editor-messages";

describe("set editor messages", () => {
  it("returns required columns by language", () => {
    expect(getCsvRequiredColumns("en")).toEqual(["Question Text", "Correct Answer"]);
    expect(getCsvRequiredColumns("th")).toEqual(["คำถาม", "คำตอบที่ถูกต้อง"]);
  });

  it("formats missing-columns message using localized required columns", () => {
    expect(getCsvMissingColumnsMessage("en", "Missing: {columns}")).toBe(
      "Missing: Question Text, Correct Answer"
    );
    expect(getCsvMissingColumnsMessage("th", "คอลัมน์ที่ต้องมี: {columns}")).toBe(
      "คอลัมน์ที่ต้องมี: คำถาม, คำตอบที่ถูกต้อง"
    );
  });

  it("passes through simple local validation fallbacks", () => {
    expect(getCsvInvalidFileMessage("Please upload CSV")).toBe("Please upload CSV");
    expect(getCsvNoValidQuestionsMessage("No valid questions")).toBe("No valid questions");
  });

  it("formats csv parse errors", () => {
    expect(getCsvParseErrorMessage("Parse error: {error}", "Unexpected quote")).toBe(
      "Parse error: Unexpected quote"
    );
  });
});
