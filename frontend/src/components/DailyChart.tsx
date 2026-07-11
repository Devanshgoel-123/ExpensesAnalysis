"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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

export function DailyChart({ data }: DailyChartProps) {
  return (
    <section className="panel chart-panel">
      <header className="panel-head">
        <h2>Daily spend</h2>
        <p>Debits grouped by day</p>
      </header>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8b84a" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#e8b84a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(232,228,220,0.55)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(v) => `₹${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(232,228,220,0.55)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "#15110e",
                border: "1px solid rgba(232,184,74,0.25)",
                borderRadius: 8,
                color: "#f4efe6",
              }}
              labelFormatter={(label) => formatShortDate(String(label))}
              formatter={(value) => [formatInr(Number(value ?? 0)), "Spent"]}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#e8b84a"
              strokeWidth={2}
              fill="url(#spendFill)"
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
