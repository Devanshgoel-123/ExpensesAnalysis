import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";

describe("PayeeSpendPanel", () => {
  it("renders tracked payee totals", () => {
    render(
      <PayeeSpendPanel
        items={[
          {
            name: "Deepan",
            total: 500,
            count: 1,
            lastDate: "2026-08-01",
            days: ["2026-08-01"],
          },
        ]}
      />,
    );
    expect(screen.getByText("Tracked people")).toBeInTheDocument();
    expect(screen.getByText("Deepan")).toBeInTheDocument();
  });
});
