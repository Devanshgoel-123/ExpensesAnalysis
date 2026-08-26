import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmountBandPanel } from "@/components/AmountBandPanel";
import { sampleBand } from "@/test/fixtures";

describe("AmountBandPanel", () => {
  it("shows cigarette band stats", () => {
    render(<AmountBandPanel band={sampleBand} />);
    expect(screen.getByText(/Tiny spends/)).toBeInTheDocument();
    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(screen.getByText("Days")).toBeInTheDocument();
  });

  it("shows empty state when no band days", () => {
    render(
      <AmountBandPanel
        band={{ ...sampleBand, days: [], count: 0, total: 0, dayCounts: {} }}
      />,
    );
    expect(screen.getByText(/No cigarette-range payments/)).toBeInTheDocument();
  });
});
