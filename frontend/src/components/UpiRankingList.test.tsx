import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpiRankingList } from "@/components/UpiRankingList";
import { sampleUpi } from "@/test/fixtures";

describe("UpiRankingList", () => {
  it("renders ranked UPI handles", () => {
    render(<UpiRankingList items={sampleUpi} month="2026-08" />);
    expect(screen.getByText("Top UPI handles")).toBeInTheDocument();
    expect(screen.getByText("swiggy@ybl")).toBeInTheDocument();
    expect(screen.getByText("rapido@ybl")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<UpiRankingList items={[]} />);
    expect(screen.getByText(/No UPI IDs detected/)).toBeInTheDocument();
  });
});
