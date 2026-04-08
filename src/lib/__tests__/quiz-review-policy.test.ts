import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getQuizReviewMode,
  parseQuizReviewModeFromRequest,
  resolveQuizReviewMode,
} from "@/lib/quiz-review-policy";

describe("quiz-review-policy", () => {
  describe("resolveQuizReviewMode", () => {
    it("prefers assignment over classroom and env", () => {
      expect(
        resolveQuizReviewMode({
          assignmentMode: "never",
          classroomMode: "end_only",
        })
      ).toBe("never");
    });

    it("falls back to classroom when assignment unset", () => {
      expect(
        resolveQuizReviewMode({
          assignmentMode: null,
          classroomMode: "never",
        })
      ).toBe("never");
    });

    it("uses env when both unset", () => {
      const prev = process.env.QUIZ_REVIEW_MODE;
      process.env.QUIZ_REVIEW_MODE = "never";
      expect(resolveQuizReviewMode({ assignmentMode: null, classroomMode: null })).toBe(
        "never"
      );
      delete process.env.QUIZ_REVIEW_MODE;
      expect(resolveQuizReviewMode({ assignmentMode: null, classroomMode: null })).toBe(
        "end_only"
      );
      if (prev === undefined) {
        delete process.env.QUIZ_REVIEW_MODE;
      } else {
        process.env.QUIZ_REVIEW_MODE = prev;
      }
    });
  });

  describe("parseQuizReviewModeFromRequest", () => {
    it("accepts null and modes", () => {
      expect(parseQuizReviewModeFromRequest(undefined)).toEqual({ ok: true, value: undefined });
      expect(parseQuizReviewModeFromRequest(null)).toEqual({ ok: true, value: null });
      expect(parseQuizReviewModeFromRequest("")).toEqual({ ok: true, value: null });
      expect(parseQuizReviewModeFromRequest("NEVER")).toEqual({ ok: true, value: "never" });
      expect(parseQuizReviewModeFromRequest("end_only")).toEqual({
        ok: true,
        value: "end_only",
      });
    });

    it("rejects invalid strings", () => {
      expect(parseQuizReviewModeFromRequest("maybe").ok).toBe(false);
    });
  });

  describe("getQuizReviewMode", () => {
    let envSnapshot: string | undefined;
    beforeEach(() => {
      envSnapshot = process.env.QUIZ_REVIEW_MODE;
    });
    afterEach(() => {
      if (envSnapshot === undefined) delete process.env.QUIZ_REVIEW_MODE;
      else process.env.QUIZ_REVIEW_MODE = envSnapshot;
    });

    it("defaults to end_only", () => {
      delete process.env.QUIZ_REVIEW_MODE;
      expect(getQuizReviewMode()).toBe("end_only");
    });
  });
});
