import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DailyChart } from "@/components/DailyChart";
import { sampleDailyInsights } from "@/test/fixtures";

describe("DailyChart", () => {
  it("renders daily spend heading and limit copy", () => {
    render(
      <DailyChart
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
