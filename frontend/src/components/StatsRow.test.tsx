import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsRow } from "@/components/StatsRow";
import { sampleSummary } from "@/test/fixtures";

describe("StatsRow", () => {
  it("renders summary stat labels", () => {
    render(<StatsRow summary={sampleSummary} />);
    expect(screen.getByText("Total spent")).toBeInTheDocument();
    expect(screen.getByText("Avg / day")).toBeInTheDocument();
    expect(screen.getByText("Debits")).toBeInTheDocument();
    expect(screen.getByText("UPI payees")).toBeInTheDocument();
  });
});
