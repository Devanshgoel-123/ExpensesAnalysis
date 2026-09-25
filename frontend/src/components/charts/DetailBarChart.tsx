"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatInrCompact } from "@/helpers/currency";
import type { ChartTone } from "@/components/charts/chartTone";
import { chartCeiling } from "@/components/charts/chartTone";
import { ChartTooltip, TooltipBody } from "@/components/charts/ChartTooltip";

export interface DetailBarPoint {
  key: string;
  value: number;
  axisPrimary: string;
  axisSecondary?: string;
  showLabel: boolean;
  tone: ChartTone;
  toneLabel: string;
  title: string;
  amountLabel: string;
  details: { text: string; tone?: ChartTone }[];
  ariaLabel: string;
  emphasized?: boolean;
  /** Day spent more than the daily limit. Clay, unless this bar is the tallest. */
  overLimit?: boolean;
}

type BarMark = "calm" | "high" | "over" | "peak";

function barMark(point: DetailBarPoint, peak: number): BarMark {
  if (point.value > 0 && peak > 0 && point.value === peak) return "peak";
  if (point.overLimit) return "over";
  if (point.tone === "calm") return "calm";
  return "high";
}

function markLabel(mark: BarMark, toneLabel: string): string {
  if (mark === "peak") return "Tallest";
  if (mark === "over") return "Over limit";
  return toneLabel;
}

export interface ChartGuide {
  value: number;
  label: string;
  tone: "watch" | "hot";
  align?: "start" | "end";
}

interface DetailBarChartProps {
  points: DetailBarPoint[];
  guides?: ChartGuide[];
  ariaLabel: string;
}

interface Tip {
  key: string;
  x: number;
  y: number;
}

const TICKS = [0, 1 / 3, 2 / 3, 1];

export function DetailBarChart({
  points,
  guides = [],
  ariaLabel,
}: DetailBarChartProps) {
  const ceiling = chartCeiling([
    ...points.map((point) => point.value),
    ...guides.map((guide) => guide.value),
  ]);
  const peak = Math.max(0, ...points.map((point) => point.value));
  const [tip, setTip] = useState<Tip | null>(null);

  const legend = new Map<string, { mark: BarMark; label: string }>();
  for (const point of points) {
    if (point.value <= 0) continue;
    const mark = barMark(point, peak);
    const label = markLabel(mark, point.toneLabel);
    const id = `${mark}:${label}`;
    if (!legend.has(id)) legend.set(id, { mark, label });
  }

  const active = points.find((point) => point.key === tip?.key) ?? null;

  const placeTip = (key: string, el: HTMLElement) => {
    const dot = el.querySelector(".lollipop-dot");
    const rect = (dot ?? el).getBoundingClientRect();
    const next = { key, x: rect.left + rect.width / 2, y: rect.top };
    setTip((prev) => {
      if (
        prev &&
        prev.key === next.key &&
        Math.abs(prev.x - next.x) < 1 &&
        Math.abs(prev.y - next.y) < 1
      ) {
        return prev;
      }
      return next;
    });
  };

  return (
    <div className="detail-chart">
      <div className="detail-chart-body" onMouseLeave={() => setTip(null)}>
        <div className="detail-y-col" aria-hidden>
          <div className="detail-scale">
            {TICKS.map((tick) => (
              <span
                key={tick}
                className="detail-y-label"
                style={{ bottom: `${tick * 100}%` }}
              >
                {formatInrCompact(tick * ceiling)}
              </span>
            ))}
          </div>
          <div className="detail-x-spacer" />
        </div>

        <div className="detail-plot-col">
          <div className="detail-scale" role="group" aria-label={ariaLabel}>
            {TICKS.map((tick) => (
              <span
                key={tick}
                className="chart-grid-line"
                style={{ bottom: `${tick * 100}%` }}
                aria-hidden
              />
            ))}
            {guides.map((guide) => {
              const bottom = (guide.value / ceiling) * 100;
              if (bottom <= 0 || bottom > 104) return null;
              return (
                <div
                  key={`${guide.label}-${guide.value}`}
                  className={`chart-guide tone-${guide.tone}${guide.align === "start" ? " align-start" : ""}`}
                  style={{ bottom: `${Math.min(bottom, 100)}%` }}
                >
                  <span>{guide.label}</span>
                </div>
              );
            })}
            <div className="detail-bars">
              {points.map((point, index) => {
                const pct = (point.value / ceiling) * 100;
                const height = point.value > 0 ? Math.max(pct, 3.5) : 0;
                const mark = barMark(point, peak);
                return (
                  <div
                    key={point.key}
                    className={`lollipop${tip?.key === point.key ? " is-active" : ""}${point.emphasized ? " is-today" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={point.ariaLabel}
                    onMouseEnter={(event) => placeTip(point.key, event.currentTarget)}
                    onMouseMove={(event) => placeTip(point.key, event.currentTarget)}
                    onFocus={(event) => placeTip(point.key, event.currentTarget)}
                    onBlur={() => setTip(null)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        placeTip(point.key, event.currentTarget);
                      }
                    }}
                  >
                    <motion.div
                      className="lollipop-mark"
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{
                        type: "spring",
                        bounce: 0.18,
                        delay: Math.min(index * 0.012, 0.36),
                      }}
                    >
                      {point.value > 0 ? (
                        <span
                          className={`lollipop-dot mark-${mark}`}
                          data-testid="chart-dot"
                          data-tone={point.tone}
                          data-mark={mark}
                        />
                      ) : null}
                      <span
                        className={`lollipop-stem mark-${mark}${point.value <= 0 ? " is-empty" : ""}`}
                      />
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="detail-x" aria-hidden>
            {points.map((point) => (
              <span key={point.key} className="bar-label">
                {point.showLabel ? (
                  <>
                    {point.axisPrimary}
                    {point.axisSecondary ? <small>{point.axisSecondary}</small> : null}
                  </>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>

      {legend.size > 0 ? (
        <div className="chart-legend">
          {[...legend.values()]
            .sort(
              (a, b) =>
                (["calm", "high", "over", "peak"] as BarMark[]).indexOf(a.mark) -
                (["calm", "high", "over", "peak"] as BarMark[]).indexOf(b.mark),
            )
            .map((item) => (
            <span key={`${item.mark}-${item.label}`} className="chart-legend-item">
              <i className={`legend-lollipop mark-${item.mark}`} aria-hidden />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      {active && tip ? (
        <ChartTooltip x={tip.x} y={tip.y}>
          <TooltipBody
            title={active.title}
            amount={active.amountLabel}
            lines={[
              ...active.details,
              {
                text: active.toneLabel,
                tone: active.tone === "calm" ? undefined : active.tone,
              },
            ]}
          />
        </ChartTooltip>
      ) : null}
    </div>
  );
}
