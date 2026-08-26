import { describe, expect, it } from "vitest";
import { userInitials } from "@/lib/userInitials";

describe("userInitials", () => {
  it("uses display name when present", () => {
    expect(userInitials({ email: "a@b.com", displayName: "Devansh Goel" })).toBe(
      "DG",
    );
  });

  it("falls back to email local part", () => {
    expect(userInitials({ email: "ledger@example.com" })).toBe("LE");
  });
});
