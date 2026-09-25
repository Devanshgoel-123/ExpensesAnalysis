import type { ChartTone } from "@/components/charts/chartTone";

interface ShareBarProps {
  /** Width of the fill, 0–1, relative to the largest item. */
  widthRatio: number;
  tone: ChartTone;
}

/** Thin horizontal bar with a status dot at the tip. */
export function ShareBar({ widthRatio, tone }: ShareBarProps) {
  const width = Math.min(100, Math.max(widthRatio > 0 ? 4 : 0, widthRatio * 100));
  const peak = widthRatio >= 0.999;
  return (
    <div className="share-bar" aria-hidden>
      <span
        className={`share-fill tone-${tone}${peak ? " is-peak" : ""}`}
        style={{ width: `${width}%` }}
      />
      {widthRatio > 0 ? (
        <span
          className={`share-dot tone-${tone}${peak ? " is-peak" : ""}`}
          data-testid="chart-dot"
          data-tone={tone}
          data-mark={peak ? "peak" : tone === "calm" ? "calm" : "high"}
          style={{ left: `calc(${width}% - 3.5px)` }}
        />
      ) : null}
    </div>
  );
}
