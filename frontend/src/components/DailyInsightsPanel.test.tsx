import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DailyInsightsPanel } from "@/components/DailyInsightsPanel";
import { sampleDailyInsights } from "@/test/fixtures";

describe("DailyInsightsPanel", () => {
  it("prompts to set a limit when disabled", () => {
    render(
      <DailyInsightsPanel
        insights={{
          limit: null,
          enabled: false,
          daysOverLimit: [],
          daysUnderLimit: 0,
          totalDaysWithSpend: 0,
          worstDay: null,
          totalOverLimit: 0,
        }}
      />,
    );
    expect(screen.getByText(/Set a daily spend cap/)).toBeInTheDocument();
  });

  it("lists over-limit days when enabled", () => {
    render(<DailyInsightsPanel insights={sampleDailyInsights} />);
    expect(screen.getByText("Daily limit insights")).toBeInTheDocument();
    expect(screen.getByText(/2 days over/)).toBeInTheDocument();
    expect(screen.getByText(/Worst day:/)).toBeInTheDocument();
  });
});
