import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { sampleBand } from "@/test/fixtures";

describe("CategoryBreakdown", () => {
  it("renders lifestyle category section", () => {
    render(
      <CategoryBreakdown
        merchants={[
          {
            merchant: "Swiggy",
            total: 1200,
            count: 2,
            lastDate: "2026-08-02",
            categorySlug: "food",
          },
        ]}
        cigaretteBand={sampleBand}
        categories={[
          {
            id: "1",
            slug: "food",
            label: "Food",
            blurb: "Delivery",
            accent: "#8b7cff",
            sortOrder: 1,
            meta: {},
          },
        ]}
      />,
    );
    expect(screen.getByText("Lifestyle split")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
  });
});
