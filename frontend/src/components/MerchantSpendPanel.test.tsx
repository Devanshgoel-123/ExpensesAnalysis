import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MerchantSpendPanel } from "@/components/MerchantSpendPanel";

describe("MerchantSpendPanel", () => {
  it("renders merchant rows", () => {
    render(
      <MerchantSpendPanel
        items={[
          {
            merchant: "Swiggy",
            total: 1200,
            count: 2,
            lastDate: "2026-08-02",
            logoUrl: "/providers/swiggy.svg",
          },
        ]}
      />,
    );
    expect(screen.getByText("Merchant spend")).toBeInTheDocument();
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
  });
});
