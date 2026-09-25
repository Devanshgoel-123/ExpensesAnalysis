import { describe, expect, it } from "vitest";
import { parseRupeeAmount } from "@/helpers/currency";

describe("parseRupeeAmount", () => {
  it("accepts plain, comma, and rupee amounts", () => {
    expect(parseRupeeAmount("1500")).toBe(1500);
    expect(parseRupeeAmount("1,500")).toBe(1500);
    expect(parseRupeeAmount("₹2,000.50")).toBe(2000.5);
    expect(parseRupeeAmount("  800 ")).toBe(800);
  });

  it("rejects empty and non-amounts", () => {
    expect(parseRupeeAmount("")).toBeNull();
    expect(parseRupeeAmount("0")).toBeNull();
    expect(parseRupeeAmount("abc")).toBeNull();
    expect(parseRupeeAmount("-20")).toBeNull();
  });
});
