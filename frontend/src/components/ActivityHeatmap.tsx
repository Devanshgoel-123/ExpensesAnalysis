"use client";

import { useState } from "react";
import { formatChartDate } from "@/helpers/dates";
import { ChartTooltip, TooltipBody } from "@/components/charts/ChartTooltip";

interface ActivityHeatmapProps {
  days: string[];
  dayCounts?: Record<string, number>;
  dayValues?: Record<string, number>;
  formatValue?: (value: number) => string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

interface Tip {
  day: string;
  x: number;
  y: number;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
    if (out.length > 120) break;
  }
  return out;
}

function heatLevel(value: number, median: number): number {
  if (value <= 0) return 0;
  if (median > 0 && value >= median * 2) return 4;
  if (median > 0 && value >= median * 1.25) return 3;
  if (median > 0 && value >= median * 0.6) return 2;
  return 1;
}

function toneLabel(level: number): string | null {
  if (level >= 4) return "Well above usual";
  if (level === 3) return "Above usual";
  return null;
}

export function ActivityHeatmap({
  days,
  dayCounts,
  dayValues,
  formatValue,
  dateFrom,
  dateTo,
}: ActivityHeatmapProps) {
  const active = new Set(days);
  const sorted = [...days].sort();
  const from = dateFrom ?? sorted[0];
  const to = dateTo ?? sorted[sorted.length - 1];
  const [tip, setTip] = useState<Tip | null>(null);

  if (!from || !to) {
    return <p className="meta">No pattern days in this range yet.</p>;
  }

  const range = buildRange(from, to);
  const values = dayValues ?? dayCounts ?? {};
  const positives = range
    .map((day) => values[day] ?? (active.has(day) ? 1 : 0))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  const median =
    positives.length > 0 ? positives[Math.floor((positives.length - 1) / 2)]! : 0;

  const describe = (day: string, value: number) => {
    if (value <= 0) return "No activity";
    if (formatValue) return formatValue(value);
    const noun = value === 1 ? "transaction" : "transactions";
    return `${value} ${noun}`;
  };

  return (
    <div className="heatmap" onMouseLeave={() => setTip(null)}>
      <div className="heatmap-grid">
        {range.map((day) => {
          const value = values[day] ?? (active.has(day) ? 1 : 0);
          const level = heatLevel(value, median);
          const amountLabel = describe(day, value);
          const flag = toneLabel(level);
          return (
            <span
              key={day}
              className={`heat-cell level-${level}`}
              aria-label={`${formatChartDate(day)}: ${amountLabel}${flag ? `, ${flag}` : ""}`}
              onMouseEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setTip({ day, x: rect.left + rect.width / 2, y: rect.top });
              }}
            />
          );
        })}
      </div>
      <div className="heatmap-footer">
        <p className="meta">
          {days.length} active day{days.length === 1 ? "" : "s"}
        </p>
        <div className="heatmap-scale" aria-label="Spend intensity scale">
          <span className="meta">Typical</span>
          {[1, 2].map((level) => (
            <span key={level} className={`heat-cell level-${level}`} aria-hidden />
          ))}
          <span className="meta">Above</span>
          <span className="heat-cell level-3" aria-hidden />
          <span className="meta">Heavy</span>
          <span className="heat-cell level-4" aria-hidden />
        </div>
      </div>
      {tip ? (
        <HeatTip
          day={tip.day}
          x={tip.x}
          y={tip.y}
          value={values[tip.day] ?? (active.has(tip.day) ? 1 : 0)}
          median={median}
          describe={describe}
        />
      ) : null}
    </div>
  );
}

function HeatTip({
  day,
  x,
  y,
  value,
  median,
  describe,
}: {
  day: string;
  x: number;
  y: number;
  value: number;
  median: number;
  describe: (day: string, value: number) => string;
}) {
  const level = heatLevel(value, median);
  const flag = toneLabel(level);
  return (
    <ChartTooltip x={x} y={y}>
      <TooltipBody
        title={formatChartDate(day)}
        amount={value > 0 ? describe(day, value) : undefined}
        lines={
          flag
            ? [{ text: flag, tone: level >= 4 ? "hot" : "watch" }]
            : value <= 0
              ? [{ text: "No activity" }]
              : [{ text: "Typical day" }]
        }
      />
    </ChartTooltip>
  );
}
