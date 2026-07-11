"use client";

interface ActivityHeatmapProps {
  days: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
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

export function ActivityHeatmap({ days, dateFrom, dateTo }: ActivityHeatmapProps) {
  const active = new Set(days);
  const sorted = [...days].sort();
  const from = dateFrom ?? sorted[0];
  const to = dateTo ?? sorted[sorted.length - 1];

  if (!from || !to) {
    return <p className="meta">No cigarette-range days yet.</p>;
  }

  const range = buildRange(from, to);

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        {range.map((day) => {
          const on = active.has(day);
          return (
            <span
              key={day}
              className={`heat-cell ${on ? "on" : ""}`}
              title={day}
            />
          );
        })}
      </div>
      <p className="meta heatmap-legend">
        {days.length} active day{days.length === 1 ? "" : "s"} · purple = purchase
      </p>
    </div>
  );
}
