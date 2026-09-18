import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveCounter } from "@/components/LiveCounter";

describe("LiveCounter", () => {
  it("eventually shows the target value", async () => {
    render(<LiveCounter value={42} continueFromPrevious={false} />);
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });
});
