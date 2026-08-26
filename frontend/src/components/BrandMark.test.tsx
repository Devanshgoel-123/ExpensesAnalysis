import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "@/components/BrandMark";

describe("BrandMark", () => {
  it("renders fallback initial without logo", () => {
    render(<BrandMark name="Swiggy" />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders provider image when logoUrl is set", () => {
    render(<BrandMark name="Swiggy" logoUrl="/providers/swiggy.svg" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/providers/swiggy.svg");
  });
});
