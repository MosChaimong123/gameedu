import { describe, it, expect } from "vitest";
import type { GameQuestion } from "../abstract-game";
import {
  BINGO_FREE_LABEL,
  buildWorkingAnswers,
  collectAnswerPool,
  countCompletedLines,
  generateCard,
  hasFreeCenter,
  normalizeCardSize,
  requiredDistinctAnswers,
} from "../bingo-card";

function q(id: string, answer: string, distractors: string[] = []): GameQuestion {
  return { id, question: `Q-${id}`, options: [answer, ...distractors], correctAnswer: 0 };
}

describe("bingo-card helpers", () => {
  it("normalizeCardSize clamps unknown sizes to 4", () => {
    expect(normalizeCardSize(3)).toBe(3);
    expect(normalizeCardSize(5)).toBe(5);
    expect(normalizeCardSize(7)).toBe(4);
    expect(normalizeCardSize(undefined)).toBe(4);
  });

  it("free center only on 5x5", () => {
    expect(hasFreeCenter(3)).toBe(false);
    expect(hasFreeCenter(4)).toBe(false);
    expect(hasFreeCenter(5)).toBe(true);
  });

  it("requiredDistinctAnswers accounts for free center", () => {
    expect(requiredDistinctAnswers(3)).toBe(9);
    expect(requiredDistinctAnswers(4)).toBe(16);
    expect(requiredDistinctAnswers(5)).toBe(24);
  });

  it("collectAnswerPool dedupes and trims, ignores blanks", () => {
    const pool = collectAnswerPool([
      q("1", " หัวใจ "),
      q("2", "ปอด"),
      q("3", "หัวใจ"),
      q("4", "   "),
      q("5", "ปอด"),
    ]);
    expect(pool).toEqual(["หัวใจ", "ปอด"]);
  });

  it("buildWorkingAnswers returns null when pool too small", () => {
    const pool = ["a", "b", "c"];
    expect(buildWorkingAnswers(pool, 3)).toBeNull();
  });

  it("buildWorkingAnswers returns exactly the required count", () => {
    const pool = Array.from({ length: 12 }, (_, i) => `a${i}`);
    const working = buildWorkingAnswers(pool, 3);
    expect(working).not.toBeNull();
    expect(working).toHaveLength(9);
    expect(new Set(working).size).toBe(9);
  });
});

describe("generateCard", () => {
  it("3x3 has no free center and contains all working answers", () => {
    const working = Array.from({ length: 9 }, (_, i) => `a${i}`);
    const { card, marked } = generateCard(working, 3);
    expect(card).toHaveLength(9);
    expect(marked.every((m) => m === false)).toBe(true);
    expect(new Set(card)).toEqual(new Set(working));
  });

  it("5x5 marks the free center cell and uses 24 answers", () => {
    const working = Array.from({ length: 24 }, (_, i) => `a${i}`);
    const { card, marked } = generateCard(working, 5);
    expect(card).toHaveLength(25);
    expect(card[12]).toBe(BINGO_FREE_LABEL);
    expect(marked[12]).toBe(true);
    expect(marked.filter((m) => m).length).toBe(1);
    const nonFree = card.filter((_, i) => i !== 12);
    expect(new Set(nonFree)).toEqual(new Set(working));
  });
});

describe("countCompletedLines (3x3)", () => {
  const none = Array(9).fill(false);

  it("counts a full row", () => {
    const marked = [...none];
    marked[0] = marked[1] = marked[2] = true;
    expect(countCompletedLines(marked, 3)).toBe(1);
  });

  it("counts a full column", () => {
    const marked = [...none];
    marked[0] = marked[3] = marked[6] = true;
    expect(countCompletedLines(marked, 3)).toBe(1);
  });

  it("counts both diagonals", () => {
    const marked = [...none];
    marked[0] = marked[4] = marked[8] = true; // main
    marked[2] = marked[6] = true; // anti (4 shared)
    expect(countCompletedLines(marked, 3)).toBe(2);
  });

  it("full card yields 8 lines (3 rows + 3 cols + 2 diagonals)", () => {
    expect(countCompletedLines(Array(9).fill(true), 3)).toBe(8);
  });

  it("empty card yields 0", () => {
    expect(countCompletedLines(none, 3)).toBe(0);
  });
});
