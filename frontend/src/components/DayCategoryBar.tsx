import { formatInr } from "@/helpers/currency";
import type { DayCategoryMix } from "@/helpers/apps";

export function DayCategoryBar({
  mix,
  compact = false,
}: {
  mix: DayCategoryMix;
  compact?: boolean;
}) {
  if (mix.total <= 0 || mix.segments.length === 0) {
    return <p className="meta">No debit spend this day.</p>;
  }

  return (
    <div className={compact ? "day-mix compact" : "day-mix"}>
      <div
        className="day-mix-bar"
        role="img"
        aria-label={mix.segments
          .map(
            (segment) =>
              `${segment.label} ${Math.round(segment.share * 100)}% (${formatInr(segment.amount)})`,
          )
          .join(", ")}
      >
        {mix.segments.map((segment) => (
          <span
            key={segment.slug}
            className={`day-mix-seg cat-${segment.slug}`}
            style={{
              width: `${Math.max(segment.share * 100, segment.amount > 0 ? 4 : 0)}%`,
              background: `var(--cat-${segment.slug}, ${segment.accent})`,
            }}
            title={`${segment.label}: ${formatInr(segment.amount)} (${Math.round(segment.share * 100)}%)`}
          />
        ))}
      </div>
      <ul className="day-mix-legend">
        {mix.segments.map((segment) => (
          <li key={segment.slug}>
            <span
              className="day-mix-dot"
              style={{ background: `var(--cat-${segment.slug}, ${segment.accent})` }}
            />
            <span>
              {segment.label} {Math.round(segment.share * 100)}%
            </span>
            <strong className="mono">{formatInr(segment.amount)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
