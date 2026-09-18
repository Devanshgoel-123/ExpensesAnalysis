import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "@/components/BrandMark";

describe("BrandMark", () => {
  it("renders fallback initial without logo", () => {
    render(<BrandMark name="Swiggy" />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders provider image when logoUrl is set", () => {
    const { container } = render(
      <BrandMark name="Swiggy" logoUrl="/providers/swiggy.svg" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "/providers/swiggy.svg");
  });
});
