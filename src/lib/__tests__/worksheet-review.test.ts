import { describe, expect, it } from "vitest";
import { parseWorksheetSubmissionContent } from "@/lib/worksheet-review";

describe("worksheet review helpers", () => {
  it("parses valid worksheet submission content", () => {
    const parsed = parseWorksheetSubmissionContent(
      JSON.stringify({
        mode: "worksheet",
        answers: {
          itemA: "hello",
          itemB: [true, false],
        },
        itemResults: [
          {
            itemId: "itemA",
            correct: true,
            score: 2,
            maxScore: 2,
            needsReview: false,
          },
        ],
      })
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.mode).toBe("worksheet");
    expect(parsed?.itemResults).toHaveLength(1);
  });

  it("returns null for invalid worksheet submission content", () => {
    expect(parseWorksheetSubmissionContent("")).toBeNull();
    expect(parseWorksheetSubmissionContent("{")).toBeNull();
    expect(
      parseWorksheetSubmissionContent(
        JSON.stringify({
          mode: "quiz",
          answers: {},
          itemResults: [],
        })
      )
    ).toBeNull();
  });
});
