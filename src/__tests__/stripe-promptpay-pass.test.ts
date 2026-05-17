import { describe, expect, it } from "vitest";
import { computePromptPayPassExpiry } from "@/lib/billing/stripe-promptpay-pass";

describe("computePromptPayPassExpiry", () => {
  it("adds 30 days for monthly when no existing expiry", () => {
    const before = Date.now();
    const expiry = computePromptPayPassExpiry("month", null);
    const days = (expiry.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThanOrEqual(29);
    expect(days).toBeLessThanOrEqual(31);
  });

  it("keeps existing expiry when it is later than the new pass", () => {
    const existing = new Date();
    existing.setFullYear(existing.getFullYear() + 1);
    const expiry = computePromptPayPassExpiry("month", existing);
    expect(expiry.getTime()).toBe(existing.getTime());
  });
});
