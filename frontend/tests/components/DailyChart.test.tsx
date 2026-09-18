import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { sampleDailyInsights } from "@test/fixtures";

describe("DailySpendChart", () => {
  it("renders daily spend heading and limit copy", () => {
    render(
      <DailySpendChart
        data={[
          { date: "2026-08-01", amount: 1500 },
          { date: "2026-08-02", amount: 2500 },
        ]}
        insights={sampleDailyInsights}
      />,
    );
    expect(screen.getByText("Daily spend")).toBeInTheDocument();
    expect(screen.getByText(/limit ₹1,000/)).toBeInTheDocument();
  });
});
