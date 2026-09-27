import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { sampleDailyInsights } from "@test/fixtures";
import type { Transaction } from "@/types";

function txn(
  date: string,
  amount: number,
  type: "debit" | "credit",
): Transaction {
  return {
    date,
    time: null,
    description: type,
    amount,
    type,
    upiId: null,
    merchant: null,
    payee: null,
  };
}

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

  it("plots debit minus credit and does not draw the gross debit", () => {
    render(
      <DailySpendChart
        transactions={[
          txn("2026-09-02", 27658, "debit"),
          txn("2026-09-02", 50000, "credit"),
          txn("2026-09-03", 1200, "debit"),
        ]}
      />,
    );

    expect(
      screen.getByText("₹28,858 debit − ₹50,000 credit"),
    ).toBeInTheDocument();
    const labels = screen
      .getAllByRole("button")
      .map((node) => node.getAttribute("aria-label") ?? "");
    expect(labels.some((label) => label.includes("27,658"))).toBe(false);
    expect(labels.some((label) => label.includes("1,200"))).toBe(true);
  });
});
