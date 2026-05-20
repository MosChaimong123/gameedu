import { describe, expect, it } from "vitest";
import { textHasLatexMarkup } from "@/components/math-render";

describe("textHasLatexMarkup", () => {
  it("treats plain Thai prose as non-LaTeX", () => {
    expect(textHasLatexMarkup("เพราะอิเล็กตรอนเคลื่อนที่ช้าเกินไป")).toBe(false);
    expect(textHasLatexMarkup("แรงแม่เหล็กเป็นวงปิด(CloseLoop)")).toBe(false);
  });

  it("detects inline and display math delimiters", () => {
    expect(textHasLatexMarkup("คำตอบคือ $x^2$")).toBe(true);
    expect(textHasLatexMarkup("$$\\frac{1}{2}$$")).toBe(true);
  });

  it("detects common LaTeX commands", () => {
    expect(textHasLatexMarkup("\\sqrt{2}")).toBe(true);
  });
});
