import { describe, expect, it } from "vitest";
import {
  monthDeltaTone,
  shareTone,
  spendTone,
  spendToneLabel,
} from "@/components/charts/chartTone";

describe("chart tones", () => {
  it("marks spikes and near-limit days", () => {
    expect(spendTone(500, 1000, null)).toBe("calm");
    expect(spendTone(1300, 1000, null)).toBe("watch");
    expect(spendTone(2500, 1000, null)).toBe("hot");
    expect(spendTone(700, 400, 1000)).toBe("watch");
    expect(spendTone(1400, 400, 1000)).toBe("hot");
    expect(spendToneLabel("hot", 1400, 1000)).toBe("Over limit");
    expect(spendToneLabel("hot", 2500, null)).toBe("Spike");
  });

  it("marks large shares and monthly jumps", () => {
    expect(shareTone(0.1)).toBe("calm");
    expect(shareTone(0.25)).toBe("watch");
    expect(shareTone(0.5)).toBe("hot");
    expect(monthDeltaTone(1100, 1000)).toBe("watch");
    expect(monthDeltaTone(1500, 1000)).toBe("hot");
    expect(monthDeltaTone(800, 1000)).toBe("calm");
  });
});
