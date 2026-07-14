"use client";

interface ActivityHeatmapProps {
  days: string[];
  dayCounts?: Record<string, number>;
  dateFrom?: string | null;
  dateTo?: string | null;
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

export function ActivityHeatmap({
  days,
  dayCounts,
  dateFrom,
  dateTo,
}: ActivityHeatmapProps) {
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
          const count = dayCounts?.[day] ?? (active.has(day) ? 1 : 0);
          const level = Math.min(count, 4);
          const transactionLabel = `${count} transaction${count === 1 ? "" : "s"}`;
          return (
            <span
              key={day}
              className={`heat-cell level-${level}`}
              title={`${day} · ${transactionLabel}`}
              aria-label={`${day}: ${transactionLabel}`}
            />
          );
        })}
      </div>
      <div className="heatmap-footer">
        <p className="meta">
          {days.length} active day{days.length === 1 ? "" : "s"}
        </p>
        <div className="heatmap-scale" aria-label="Transaction activity scale">
          <span className="meta">Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={`heat-cell level-${level}`}
              aria-hidden
            />
          ))}
          <span className="meta">More</span>
        </div>
      </div>
    </div>
  );
}
