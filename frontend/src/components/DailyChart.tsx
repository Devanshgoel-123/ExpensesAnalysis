"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailySpend } from "@/lib/types";
import { formatInr, formatShortDate } from "@/lib/api";

interface DailyChartProps {
  data: DailySpend[];
}

const BAR_COLORS = ["#8b7cff", "#6d5cff", "#5b8dff", "#7c6af5", "#9a8cff"];

export function DailyChart({ data }: DailyChartProps) {
  return (
    <section className="panel chart-panel interactive-card">
      <header className="panel-head">
        <h2>Daily spend</h2>
        <p>Debits by day</p>
      </header>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              stroke="transparent"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v) =>
                `₹${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`
              }
              stroke="transparent"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "rgba(109, 92, 255, 0.08)" }}
              contentStyle={{
                background: "rgba(18, 18, 24, 0.95)",
                border: "1px solid rgba(139, 124, 255, 0.35)",
                borderRadius: 14,
                color: "#fff",
                boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
              }}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value) => [formatInr(Number(value ?? 0)), "Spent"]}
            />
            <Bar
              dataKey="amount"
              radius={[10, 10, 4, 4]}
              maxBarSize={42}
              animationDuration={900}
            >
              {data.map((_, index) => (
                <Cell
                  key={`bar-${index}`}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
